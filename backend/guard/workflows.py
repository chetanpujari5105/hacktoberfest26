"""Temporal workflows: one RunGuardWorkflow per training run, one WalletGuardWorkflow.

Workflow code must be deterministic: no I/O, only ``workflow.now()`` /
``workflow.sleep()`` and activities. State lives in a frozen ``RunState`` that
is replaced (never mutated) on every change.
"""

from __future__ import annotations

from datetime import timedelta

from temporalio import workflow
from temporalio.common import RetryPolicy
from temporalio.exceptions import ActivityError

with workflow.unsafe.imports_passed_through():
    from guard import messages, rules
    from guard.activities import GuardActivities
    from guard.models import (
        CheckpointRequest,
        DecideAction,
        JudgeRequest,
        Notification,
        RunInput,
        RunState,
        RunStatus,
        Verdict,
        WalletInput,
    )

QUICK = {
    "start_to_close_timeout": timedelta(seconds=90),
    "retry_policy": RetryPolicy(initial_interval=timedelta(seconds=2), maximum_attempts=5),
}
JUDGE = {
    "start_to_close_timeout": timedelta(seconds=150),
    "retry_policy": RetryPolicy(maximum_attempts=2),
}
# Resume is not idempotent (it can return a new machine id), so never auto-retry it:
# on failure the run stays paused and the human taps Resume again.
RESUME = {
    "start_to_close_timeout": timedelta(minutes=20),
    "retry_policy": RetryPolicy(maximum_attempts=1),
}
MAX_EXTEND_MINUTES = 720
WALLET_LOOPS_BEFORE_CONTINUE = 100
VALID_DECISIONS: frozenset[str] = frozenset({"pause", "keep", "resolved"})
# A "pause" arriving in these states is stale (double tap, old button, pause_all).
IGNORE_PAUSE_IN: frozenset[RunStatus] = frozenset(
    {RunStatus.CHECKPOINTING, RunStatus.PAUSED, RunStatus.RESUMING}
)


@workflow.defn
class RunGuardWorkflow:
    @workflow.init
    def __init__(self, inp: RunInput) -> None:
        self._policy = inp.policy
        self._state = inp.carry or RunState(
            run_id=inp.run_id,
            machine_id=inp.machine_id,
            name=inp.name,
            gpu_type=inp.gpu_type,
            hourly_cost_inr=inp.hourly_cost_inr,
            started_at=workflow.now(),
        )
        self._decision: DecideAction | None = None
        self._resume_requested = False
        self._resume_gpu: str | None = None
        self._snooze_s = 0
        self._extend_seq = 0
        self._stop = False

    # ── public surface ────────────────────────────────────────────────────
    @workflow.run
    async def run(self, inp: RunInput) -> RunState:
        if inp.carry is None:
            self._log("started", f"Guarding machine {inp.machine_id}")
        loops = 0
        while not self._stop:
            await self._tick()
            loops += 1
            if loops >= self._policy.max_loops_before_continue and self._can_continue_as_new():
                await workflow.wait_condition(workflow.all_handlers_finished)
                workflow.continue_as_new(inp.model_copy(update={"carry": self._state}))
        self._state = self._state.with_status(RunStatus.STOPPED)
        self._log("stopped", "Guard stopped")
        return self._state

    @workflow.query
    def get_state(self) -> RunState:
        return self._state

    @workflow.signal
    def decide(self, action: str) -> None:
        if action not in VALID_DECISIONS:
            return
        if action == "pause" and self._state.status in IGNORE_PAUSE_IN:
            return
        self._decision = action  # type: ignore[assignment]

    @workflow.signal
    def extend(self, minutes: int) -> None:
        self._snooze_s += max(0, min(minutes, MAX_EXTEND_MINUTES)) * 60
        self._extend_seq += 1  # wakes an in-progress idle so the snooze applies now
        if self._state.status == RunStatus.AWAITING_DECISION:
            self._decision = "keep"

    @workflow.signal
    def resume(self, gpu_type: str | None = None) -> None:
        self._resume_requested = True
        self._resume_gpu = gpu_type or None

    @workflow.signal
    def stop(self) -> None:
        self._stop = True

    # ── main loop ─────────────────────────────────────────────────────────
    async def _tick(self) -> None:
        try:
            probe = await workflow.execute_activity_method(
                GuardActivities.probe, self._state.machine_id, **QUICK
            )
        except ActivityError as err:
            self._log("warning", f"Probe failed ({_cause(err)}); retrying next interval")
            await self._idle(self._policy.probe_interval_s)
            return
        self._state = self._state.with_probe(probe)
        suspicion = rules.assess(probe, self._policy)
        sleep_s = self._policy.probe_interval_s
        if suspicion.suspicious:
            verdict = await self._judge(
                JudgeRequest(run_name=self._state.name, probe=probe, suspicion=suspicion)
            )
            if verdict.action == "keep_running" and verdict.recheck_minutes:
                sleep_s = verdict.recheck_minutes * 60
            await self._handle(verdict)
        if not self._stop:
            await self._idle(sleep_s)

    async def _judge(self, req: JudgeRequest) -> Verdict:
        try:
            verdict = await workflow.execute_activity_method(GuardActivities.judge, req, **JUDGE)
        except ActivityError:
            verdict = rules.fallback_verdict(req.probe, req.suspicion)
        verdict = verdict.model_copy(update={"at": workflow.now()})
        self._state = self._state.with_verdict(verdict)
        self._log("verdict", f"{verdict.source}: {verdict.action} ({verdict.reason})")
        return verdict

    async def _handle(self, verdict: Verdict) -> None:
        if verdict.action == "pause_run":
            await self._confirm_and_pause(verdict)
        elif verdict.action == "escalate_to_kepler":
            await self._escalate(verdict)

    async def _idle(self, seconds: int) -> None:
        if self._decision in ("keep", "resolved"):
            self._decision = None  # stale answer to an earlier question
        deadline = workflow.now() + timedelta(seconds=seconds + self._take_snooze())
        while True:
            remaining = (deadline - workflow.now()).total_seconds()
            if remaining <= 0:
                return
            seen = self._extend_seq
            try:
                await workflow.wait_condition(
                    lambda seen=seen: (
                        self._stop or self._decision == "pause" or self._extend_seq != seen
                    ),
                    timeout=timedelta(seconds=remaining),
                )
            except TimeoutError:
                return
            if self._extend_seq == seen:
                break
            deadline += timedelta(seconds=self._take_snooze())
            self._log("decision", f"Guard snoozed until {deadline:%H:%M} UTC")
        if self._decision == "pause" and not self._stop:
            self._decision = None
            self._log("decision", "Pause requested manually")
            await self._checkpoint_pause_resume()

    # ── decision flows ────────────────────────────────────────────────────
    async def _confirm_and_pause(self, verdict: Verdict) -> None:
        self._set_status(RunStatus.AWAITING_DECISION)
        self._decision = None
        await self._notify(messages.looks_done(self._state, verdict, self._policy))
        decision = await self._await_decision(timedelta(seconds=self._policy.decision_timeout_s))
        if self._stop:
            return
        if decision is None and not self._policy.auto_pause_on_timeout:
            self._snooze_s = max(self._snooze_s, self._policy.keep_snooze_s)
            self._set_status(RunStatus.WATCHING)
            self._log("decision", "No response; notify-only policy keeps the run going")
            return
        if decision in ("keep", "resolved"):
            self._snooze_s = max(self._snooze_s, self._policy.keep_snooze_s)
            self._set_status(RunStatus.WATCHING)
            self._log("decision", f"Kept running; next check in {self._snooze_s // 60} min")
            return
        self._log("decision", "Pause approved" if decision else "No response; auto-pausing")
        await self._checkpoint_pause_resume()

    async def _escalate(self, verdict: Verdict) -> None:
        self._set_status(RunStatus.NEEDS_TRIAGE)
        self._decision = None
        await self._notify(messages.needs_triage(self._state, verdict))
        decision = await self._await_decision(None)
        if self._stop:
            return
        if decision == "pause":
            self._log("decision", "Pause requested during triage")
            await self._checkpoint_pause_resume()
            return
        self._snooze_s = max(self._snooze_s, self._policy.keep_snooze_s)
        self._set_status(RunStatus.WATCHING)
        self._log("resolved", "Triage closed; watching again")

    async def _checkpoint_pause_resume(self) -> None:
        machine_id = self._state.machine_id
        self._decision = None
        self._resume_requested, self._resume_gpu = False, None
        probe = self._state.last_probe
        if probe is not None and probe.process_alive:
            await self._checkpoint(machine_id)
        try:
            await workflow.execute_activity_method(GuardActivities.pause, machine_id, **QUICK)
        except ActivityError as err:
            self._set_status(RunStatus.WATCHING)
            self._log("warning", f"Pause failed ({_cause(err)}); still watching")
            await self._notify(messages.action_failed(self._state, "pause", _cause(err)))
            return
        self._state = self._state.paused(workflow.now())
        self._log("paused", f"Machine {machine_id} paused")
        await self._notify(messages.paused(self._state))
        await self._wait_and_resume(machine_id)

    async def _wait_and_resume(self, machine_id: int) -> None:
        while True:
            await workflow.wait_condition(lambda: self._stop or self._resume_requested)
            if self._stop:
                return
            self._set_status(RunStatus.RESUMING)
            gpu = self._resume_gpu
            self._resume_requested, self._resume_gpu = False, None
            try:
                new_id = await workflow.execute_activity_method(
                    GuardActivities.resume, messages.resume_request(machine_id, gpu), **RESUME
                )
            except ActivityError as err:
                self._set_status(RunStatus.PAUSED)
                self._log("warning", f"Resume failed ({_cause(err)}); still paused")
                await self._notify(messages.action_failed(self._state, "resume", _cause(err)))
                continue
            self._state = self._state.resumed(workflow.now(), new_id, gpu)
            self._decision = None  # drop any pause that raced with the resume
            self._log("resumed", f"Resumed as machine {new_id} on {gpu or 'the same GPU'}")
            return

    async def _checkpoint(self, machine_id: int) -> None:
        self._set_status(RunStatus.CHECKPOINTING)
        timeout = self._policy.checkpoint_timeout_s
        try:
            await workflow.execute_activity_method(
                GuardActivities.request_checkpoint, machine_id, **QUICK
            )
            saved = await workflow.execute_activity_method(
                GuardActivities.wait_checkpoint,
                CheckpointRequest(machine_id=machine_id, timeout_s=timeout),
                start_to_close_timeout=timedelta(seconds=timeout + 60),
                heartbeat_timeout=timedelta(seconds=30),
                retry_policy=RetryPolicy(maximum_attempts=2),
            )
        except ActivityError as err:
            self._log("warning", f"Checkpoint failed ({_cause(err)}); pausing anyway")
            return
        self._log(
            "checkpoint",
            "Checkpoint saved" if saved else "Checkpoint timed out; pausing anyway",
        )

    # ── helpers ───────────────────────────────────────────────────────────
    async def _await_decision(self, timeout: timedelta | None) -> DecideAction | None:
        try:
            await workflow.wait_condition(
                lambda: self._stop or self._decision is not None, timeout=timeout
            )
        except TimeoutError:
            return None
        decision, self._decision = self._decision, None
        return decision

    async def _notify(self, notification: Notification) -> None:
        try:
            await workflow.execute_activity_method(GuardActivities.notify, notification, **QUICK)
        except ActivityError:
            self._log("warning", "Notification failed; check Telegram settings")

    def _take_snooze(self) -> int:
        snooze, self._snooze_s = self._snooze_s, 0
        return snooze

    def _set_status(self, status: RunStatus) -> None:
        self._state = self._state.with_status(status)

    def _log(self, kind: str, message: str) -> None:
        self._state = self._state.with_event(workflow.now(), kind, message)

    def _can_continue_as_new(self) -> bool:
        return (
            not self._stop
            and self._decision is None
            and not self._resume_requested
            and self._snooze_s == 0
        )


def _cause(err: ActivityError) -> str:
    """Short, human-readable root cause of an activity failure."""
    cause = err.cause or err
    return str(getattr(cause, "message", None) or cause)[:160]


@workflow.defn
class WalletGuardWorkflow:
    @workflow.run
    async def run(self, inp: WalletInput) -> None:
        level, loops = inp.last_level, inp.loops
        while True:
            level = await self._check(inp, level)
            loops += 1
            if loops >= WALLET_LOOPS_BEFORE_CONTINUE:
                workflow.continue_as_new(inp.model_copy(update={"last_level": level, "loops": 0}))
            await workflow.sleep(timedelta(seconds=inp.interval_s))

    async def _check(self, inp: WalletInput, level: str) -> str:
        try:
            balance = await workflow.execute_activity_method(
                GuardActivities.balance,
                start_to_close_timeout=timedelta(seconds=30),
                retry_policy=RetryPolicy(maximum_attempts=3),
            )
        except ActivityError:
            workflow.logger.warning("wallet balance check failed")
            return level
        new_level = messages.wallet_level(balance, inp.warn_threshold, inp.critical_threshold)
        if new_level == level or new_level == "ok":
            return new_level
        # Protect the wallet first; a broken Telegram config must never block the pause.
        if new_level == "critical":
            try:
                await workflow.execute_activity_method(
                    GuardActivities.pause_all_runs, "wallet critical", **QUICK
                )
            except ActivityError:
                workflow.logger.error("pause_all_runs failed; will retry next check")
                return level
        try:
            await workflow.execute_activity_method(
                GuardActivities.notify, messages.wallet_alert(balance, new_level), **QUICK
            )
        except ActivityError:
            workflow.logger.warning("wallet alert could not be sent")
        return new_level

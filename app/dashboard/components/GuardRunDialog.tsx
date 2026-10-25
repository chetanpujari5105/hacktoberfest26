"use client";

import { useCallback, useEffect, useState } from "react";
import { Check } from "lucide-react";
import Dialog from "@/components/leaseguard/Dialog";
import InlineError from "@/components/leaseguard/InlineError";
import Skeleton from "@/components/leaseguard/Skeleton";
import { apiRequest, type ApiResult } from "@/libs/leaseguard/client";
import { describePolicy, formatGpu, formatMinutes, formatMoney, NO_RESPONSE_LABEL } from "@/libs/leaseguard/format";
import type { ApiError, EligibleInstance, PolicyPreset, Run } from "@/libs/leaseguard/types";

interface GuardRunDialogProps {
  open: boolean;
  onClose: () => void;
  onStarted: (run: Run) => void;
}

/** Mounted only while open so every opening starts from step 1 with fresh lists. */
export default function GuardRunDialog({ open, onClose, onStarted }: GuardRunDialogProps) {
  return open ? <GuardRunFlow onClose={onClose} onStarted={onStarted} /> : null;
}

type Step = 1 | 2 | 3;
const STEPS: { step: Step; label: string }[] = [
  { step: 1, label: "Instance" },
  { step: 2, label: "Policy" },
  { step: 3, label: "Review" },
];

type Lists =
  | { status: "loading" }
  | { status: "ready"; instances: ApiResult<EligibleInstance[]>; policies: ApiResult<PolicyPreset[]> };

const loadLists = () =>
  Promise.all([
    apiRequest<EligibleInstance[]>("/api/instances/eligible"),
    apiRequest<PolicyPreset[]>("/api/policies"),
  ]);

function GuardRunFlow({ onClose, onStarted }: Omit<GuardRunDialogProps, "open">) {
  const [step, setStep] = useState<Step>(1);
  const [lists, setLists] = useState<Lists>({ status: "loading" });
  const [machineId, setMachineId] = useState<number>();
  const [policyId, setPolicyId] = useState<string>();
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState<ApiError>();

  useEffect(() => {
    let active = true;
    loadLists().then(([instances, policies]) => {
      if (active) setLists({ status: "ready", instances, policies });
    });
    return () => {
      active = false;
    };
  }, []);

  const reload = useCallback(async () => {
    setLists({ status: "loading" });
    const [instances, policies] = await loadLists();
    setLists({ status: "ready", instances, policies });
  }, []);

  const instances = lists.status === "ready" && lists.instances.ok ? lists.instances.data : undefined;
  const policies = lists.status === "ready" && lists.policies.ok ? lists.policies.data : undefined;
  const instance = instances?.find((i) => i.machineId === machineId);
  const policy = policies?.find((p) => p.id === policyId);

  const submit = async () => {
    if (!instance || !policy) return;
    setPending(true);
    setSubmitError(undefined);
    const result = await apiRequest<Run>("/api/runs", {
      method: "POST",
      body: {
        machine_id: instance.machineId,
        policy: {
          preset_id: policy.id,
          check_interval_min: policy.checkIntervalMin,
          idle_threshold_pct: policy.idleThresholdPct,
          idle_window_min: policy.idleWindowMin,
          reminder_timeout_min: policy.reminderTimeoutMin,
          on_no_response: policy.onNoResponse,
        },
      },
    });
    setPending(false);
    if (result.ok) onStarted(result.data);
    else setSubmitError(result.error);
  };

  const canNext = step === 1 ? !!instance : step === 2 ? !!policy : false;

  return (
    <Dialog
      open
      onClose={onClose}
      dismissible={!pending}
      wide
      title="Guard a run"
      description={
        <ol className="mt-2 flex items-center gap-2 text-xs" aria-label="Progress">
          {STEPS.map((s, i) => {
            const done = step > s.step;
            const current = step === s.step;
            return (
              <li key={s.step} aria-current={current ? "step" : undefined} className="flex items-center gap-2">
                <span
                  className={`grid h-5 w-5 place-items-center rounded-full text-[11px] font-semibold ${
                    current
                      ? "bg-primary text-primary-content"
                      : done
                        ? "bg-accent/15 text-accent"
                        : "bg-base-300 text-base-content/70"
                  }`}
                >
                  {done ? <Check aria-hidden="true" className="h-3 w-3" /> : s.step}
                </span>
                <span className={current ? "font-semibold text-base-content" : "text-base-content/70"}>
                  {s.label}
                  {done && <span className="sr-only"> (done)</span>}
                </span>
                {i < STEPS.length - 1 && <span aria-hidden="true" className="h-px w-5 bg-base-content/15" />}
              </li>
            );
          })}
        </ol>
      }
      footer={
        <>
          {step > 1 ? (
            <button type="button" className="btn btn-ghost" disabled={pending} onClick={() => setStep((s) => (s - 1) as Step)}>
              Back
            </button>
          ) : (
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
          )}
          {step < 3 ? (
            <button type="button" className="btn btn-primary" disabled={!canNext} onClick={() => setStep((s) => (s + 1) as Step)}>
              Next
            </button>
          ) : (
            <button type="button" className="btn btn-primary" disabled={pending} aria-busy={pending} onClick={submit}>
              {pending && <span className="loading loading-spinner loading-sm" aria-hidden="true" />}
              {pending ? "Starting guard…" : submitError ? "Try again" : "Start guarding"}
            </button>
          )}
        </>
      }
    >
      {lists.status === "loading" ? (
        <div aria-busy="true" aria-label="Loading options" className="space-y-2.5">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : step === 1 ? (
        <ListStep
          result={lists.instances}
          onRetry={reload}
          emptyText="Every running instance is already guarded. Start a new JarvisLabs instance and it will show up here."
          unavailableText="Not available yet — the backend doesn't list guardable instances yet."
        >
          {(items: EligibleInstance[]) => (
            <fieldset className="space-y-2.5">
              <legend className="mb-3 text-sm text-base-content/80">Which running instance should LeaseGuard watch?</legend>
              {items.map((item) => (
                <OptionCard
                  key={item.machineId}
                  name="instance"
                  checked={machineId === item.machineId}
                  onSelect={() => setMachineId(item.machineId)}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <span className="num font-medium">{item.name}</span>
                    {item.hourlyRate !== undefined && (
                      <span className="num text-sm text-base-content/75">{formatMoney(item.hourlyRate)}/h</span>
                    )}
                  </div>
                  <p className="num mt-1 text-xs text-base-content/70">
                    {formatGpu(item.gpuType, item.gpuCount)} · machine {item.machineId}
                    {item.providerStatus ? ` · ${item.providerStatus}` : ""}
                  </p>
                </OptionCard>
              ))}
            </fieldset>
          )}
        </ListStep>
      ) : step === 2 ? (
        <ListStep
          result={lists.policies}
          onRetry={reload}
          emptyText="The backend didn't return any policy presets."
          unavailableText="Not available yet — the backend doesn't publish policy presets yet."
        >
          {(items: PolicyPreset[]) => (
            <fieldset className="space-y-2.5">
              <legend className="mb-3 text-sm text-base-content/80">
                How patient should the guard be with <span className="num">{instance?.name}</span>?
              </legend>
              {items.map((p) => (
                <OptionCard key={p.id} name="policy" checked={policyId === p.id} onSelect={() => setPolicyId(p.id)}>
                  <p className="font-medium">{p.name}</p>
                  {p.description && <p className="mt-0.5 text-sm text-base-content/75">{p.description}</p>}
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
                    <PolicyFact label="Check every" value={formatMinutes(p.checkIntervalMin)} />
                    <PolicyFact label="Idle when" value={`<${p.idleThresholdPct}% for ${formatMinutes(p.idleWindowMin)}`} />
                    <PolicyFact label="Reply within" value={formatMinutes(p.reminderTimeoutMin)} />
                    <PolicyFact label="If no reply" value={p.onNoResponse === "checkpoint_and_pause" ? "Checkpoint + pause" : "Remind only"} />
                  </dl>
                </OptionCard>
              ))}
            </fieldset>
          )}
        </ListStep>
      ) : instance && policy ? (
        <div className="space-y-4">
          <div className="rounded-lg bg-base-100/60 p-4 ring-1 ring-base-content/[0.07] ring-inset">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-base-content/70">Instance</dt>
                <dd className="num mt-0.5 font-medium">{instance.name}</dd>
                <dd className="num text-xs text-base-content/70">{formatGpu(instance.gpuType, instance.gpuCount)}</dd>
              </div>
              <div>
                <dt className="text-xs text-base-content/70">Policy</dt>
                <dd className="mt-0.5 font-medium">{policy.name}</dd>
                <dd className="text-xs text-base-content/70">{NO_RESPONSE_LABEL[policy.onNoResponse]}</dd>
              </div>
            </dl>
          </div>
          <div>
            <h3 className="text-sm font-semibold">What will happen</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-base-content/85">{describePolicy(policy).join(" ")}</p>
          </div>
          {submitError && <InlineError error={submitError} />}
        </div>
      ) : null}
    </Dialog>
  );
}

function ListStep<T>({
  result,
  onRetry,
  emptyText,
  unavailableText,
  children,
}: {
  result: ApiResult<T[]>;
  onRetry: () => void;
  emptyText: string;
  unavailableText: string;
  children: (items: T[]) => React.ReactNode;
}) {
  if (!result.ok) {
    return result.error.code === "NOT_IMPLEMENTED" ? (
      <p className="rounded-lg bg-base-300/60 p-4 text-sm text-base-content/80">{unavailableText}</p>
    ) : (
      <InlineError error={result.error} onRetry={onRetry} />
    );
  }
  if (result.data.length === 0) return <p className="rounded-lg bg-base-300/60 p-4 text-sm text-base-content/80">{emptyText}</p>;
  return <>{children(result.data)}</>;
}

function OptionCard({
  name,
  checked,
  onSelect,
  children,
}: {
  name: string;
  checked: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors ${
        checked ? "border-primary/60 bg-primary/[0.05]" : "border-base-content/10 hover:border-base-content/25"
      }`}
    >
      <input type="radio" name={name} checked={checked} onChange={onSelect} className="radio radio-primary radio-sm mt-0.5" />
      <span className="min-w-0 flex-1">{children}</span>
    </label>
  );
}

function PolicyFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-base-content/70">{label}</dt>
      <dd className="num mt-0.5 text-sm text-base-content">{value}</dd>
    </div>
  );
}

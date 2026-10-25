"""Toy trainer for the LeaseGuard demo. Runs on a Jarvislabs GPU box (falls back to CPU).

Contract with LeaseGuard's probe (paths are configurable on the backend):
  ~/train.log   one "step=N loss=X" line per log interval (errors/tracebacks too)
  ~/train.pid   PID of this process while it runs
  ~/ckpt.flag   created by LeaseGuard -> we save ~/ckpt.pt, then create ~/ckpt.done

Modes:
  --converge  loss falls, then plateaus at the noise floor   -> Gemma: pause_run
  --stall     after --fail-after steps, hangs (alive, GPU idle, silent) -> escalate
  --oom       after --fail-after steps, CUDA out-of-memory crash         -> escalate

Start detached on the box:
  nohup python ~/train.py --converge >/dev/null 2>&1 &
"""

from __future__ import annotations

import argparse
import os
import sys
import time
import traceback
from pathlib import Path

import torch
from torch import nn

HOME = Path.home()
LOG = HOME / "train.log"
PID = HOME / "train.pid"
FLAG = HOME / "ckpt.flag"
DONE = HOME / "ckpt.done"
CKPT = HOME / "ckpt.pt"
FEATURES = 512
BATCH = 4096
NOISE = 0.1


def log(message: str) -> None:
    line = message.rstrip("\n") + "\n"
    with LOG.open("a") as fh:
        fh.write(line)
    sys.stdout.write(line)


def build(device: torch.device) -> tuple[nn.Module, torch.optim.Optimizer, torch.Tensor]:
    torch.manual_seed(0)
    model = nn.Sequential(
        nn.Linear(FEATURES, 2048), nn.ReLU(), nn.Linear(2048, 2048), nn.ReLU(), nn.Linear(2048, 1)
    ).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)
    true_weights = torch.randn(FEATURES, 1, device=device) / FEATURES**0.5
    return model, optimizer, true_weights


def save_checkpoint(step: int, model: nn.Module, optimizer: torch.optim.Optimizer) -> None:
    torch.save({"step": step, "model": model.state_dict(), "opt": optimizer.state_dict()}, CKPT)
    FLAG.unlink(missing_ok=True)
    DONE.touch()
    log(f"checkpoint saved at step={step} -> {CKPT}")


def load_checkpoint(model: nn.Module, optimizer: torch.optim.Optimizer) -> int:
    state = torch.load(CKPT, map_location="cpu")
    model.load_state_dict(state["model"])
    optimizer.load_state_dict(state["opt"])
    log(f"resumed from {CKPT} at step={state['step']}")
    return int(state["step"])


def fail(mode: str, device: torch.device) -> None:
    if mode == "stall":
        log("waiting on data loader...")  # then silence: alive, idle, no logs
        while not FLAG.exists():
            time.sleep(5)
        return
    if device.type == "cuda":
        torch.empty(1 << 40, device=device)  # ~4 TB: raises torch.OutOfMemoryError
    raise RuntimeError("CUDA out of memory. Tried to allocate 20.00 GiB (simulated on CPU)")


def train(args: argparse.Namespace) -> None:
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model, optimizer, true_weights = build(device)
    step = load_checkpoint(model, optimizer) if args.resume and CKPT.exists() else 0
    log(f"training on {device} mode={args.mode}")
    while step < args.max_steps:
        step += 1
        x = torch.randn(BATCH, FEATURES, device=device)
        y = x @ true_weights + NOISE * torch.randn(BATCH, 1, device=device)
        loss = nn.functional.mse_loss(model(x), y)
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
        if step % args.log_every == 0:
            log(f"step={step} loss={loss.item():.5f}")
        if FLAG.exists():
            save_checkpoint(step, model, optimizer)
        if args.mode != "converge" and step == args.fail_after:
            fail(args.mode, device)
    log(f"finished at step={step}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--converge", dest="mode", action="store_const", const="converge")
    mode.add_argument("--stall", dest="mode", action="store_const", const="stall")
    mode.add_argument("--oom", dest="mode", action="store_const", const="oom")
    parser.set_defaults(mode="converge")
    parser.add_argument("--fail-after", type=int, default=600, help="steps before stall/oom")
    parser.add_argument("--log-every", type=int, default=50)
    parser.add_argument("--max-steps", type=int, default=1_000_000)
    parser.add_argument("--resume", action="store_true", help="continue from ~/ckpt.pt")
    args = parser.parse_args()

    PID.write_text(str(os.getpid()))
    DONE.unlink(missing_ok=True)
    try:
        train(args)
    except BaseException:
        log(traceback.format_exc())
        raise
    finally:
        PID.unlink(missing_ok=True)


if __name__ == "__main__":
    main()

"use client";

import { useState } from "react";
import type { Envelope, RunView, StartRunInput } from "@/libs/backend-types";
import { getErrorMessage } from "@/libs/runs";
import { FormSection } from "@/components/ui/FormSection";
import { Panel } from "@/components/ui/Panel";

interface GuardRunFormProps {
  defaultHourlyCostInr: number;
  onCreated: () => void;
}

interface FormState {
  machineId: string;
  name: string;
  gpuType: string;
  hourlyCost: string;
}

function toInput(form: FormState): StartRunInput | string {
  const machineId = Number(form.machineId);
  const hourlyCost = Number(form.hourlyCost);
  if (!Number.isInteger(machineId) || machineId <= 0) return "Machine ID must be a positive number";
  if (!form.name.trim()) return "Give the run a name";
  if (!(hourlyCost > 0)) return "Hourly cost must be greater than 0";
  return {
    machine_id: machineId,
    name: form.name.trim(),
    gpu_type: form.gpuType.trim() || null,
    hourly_cost_inr: hourlyCost,
  };
}

export default function GuardRunForm({ defaultHourlyCostInr, onCreated }: GuardRunFormProps) {
  const emptyForm: FormState = {
    machineId: "",
    name: "",
    gpuType: "",
    hourlyCost: String(defaultHourlyCostInr),
  };
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = toInput(form);
    if (typeof input === "string") {
      setError(input);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const body = (await res.json()) as Envelope<RunView>;
      if (!body.success) {
        setError(body.error ?? "Could not start guarding this run");
        return;
      }
      setForm(emptyForm);
      onCreated();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Panel title="Guard a run">
      <form onSubmit={submit} className="grid grid-cols-1 gap-3 md:grid-cols-5 md:items-end">
        <FormSection label="Machine ID">
          <input className="input input-sm w-full" inputMode="numeric" value={form.machineId} onChange={update("machineId")} placeholder="12345" />
        </FormSection>
        <FormSection label="Name">
          <input className="input input-sm w-full" value={form.name} onChange={update("name")} placeholder="resnet-finetune" maxLength={80} />
        </FormSection>
        <FormSection label="GPU (optional)">
          <input className="input input-sm w-full" value={form.gpuType} onChange={update("gpuType")} placeholder="A100" />
        </FormSection>
        <FormSection label="₹/hour">
          <input className="input input-sm w-full" inputMode="decimal" value={form.hourlyCost} onChange={update("hourlyCost")} />
        </FormSection>
        <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
          {submitting ? <span className="loading loading-spinner loading-xs" /> : "Start guarding"}
        </button>
      </form>
      {error && <p className="text-sm text-error">{error}</p>}
    </Panel>
  );
}

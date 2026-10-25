import type { Metadata } from "next";
import { notFound } from "next/navigation";
import config from "@/config";
import RunDetailView from "@/app/dashboard/runs/[id]/components/RunDetailView";

const RUN_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

interface RunPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: RunPageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: RUN_ID_RE.test(id) ? `Run ${id}` : "Run not found" };
}

export default async function RunPage({ params }: RunPageProps) {
  const { id } = await params;
  if (!RUN_ID_RE.test(id)) notFound();

  const { pollIntervalMs, maxBackoffMs, keepMinutes, extendMinuteOptions, gpuTypes } = config.leaseguard;
  return (
    <RunDetailView
      id={id}
      pollIntervalMs={pollIntervalMs.runDetail}
      maxBackoffMs={maxBackoffMs}
      keepMinutes={keepMinutes}
      extendMinuteOptions={[...extendMinuteOptions]}
      gpuTypes={gpuTypes.map((g) => ({ ...g }))}
    />
  );
}

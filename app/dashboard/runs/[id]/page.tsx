import Link from "next/link";
import { notFound } from "next/navigation";
import config from "@/config";
import { isValidRunId } from "@/libs/runs";
import RunDetail from "./components/RunDetail";

export default async function RunPage(props: PageProps<"/dashboard/runs/[id]">) {
  const { id } = await props.params;
  if (!isValidRunId(id)) notFound();

  return (
    <div className="layout space-y-6">
      <Link href="/dashboard" className="link link-hover text-sm text-base-content/60">
        ← All runs
      </Link>
      <RunDetail
        runId={id}
        pollIntervalMs={config.leaseguard.pollIntervalMs}
        snoozeMinutes={config.leaseguard.snoozeMinutes}
        resumeGpuOption={config.leaseguard.resumeGpuOption}
      />
    </div>
  );
}

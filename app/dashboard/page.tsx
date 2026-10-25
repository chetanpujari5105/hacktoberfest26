import config from "@/config";
import RunsOverview from "./components/RunsOverview";

export default function DashboardPage() {
  return (
    <div className="layout space-y-6">
      <div>
        <h1 className="text-3xl font-bold">LeaseGuard</h1>
        <p className="mt-1 text-base-content/60">
          Finished runs get checkpointed and paused. Broken runs go to Kepler.
        </p>
      </div>

      <RunsOverview
        pollIntervalMs={config.leaseguard.pollIntervalMs}
        defaultHourlyCostInr={config.leaseguard.defaultHourlyCostInr}
      />
    </div>
  );
}

import config from "@/config";
import DashboardView from "@/app/dashboard/components/DashboardView";

export default function DashboardPage() {
  return (
    <DashboardView
      pollIntervalMs={config.leaseguard.pollIntervalMs.dashboard}
      maxBackoffMs={config.leaseguard.maxBackoffMs}
    />
  );
}

import Skeleton from "@/components/leaseguard/Skeleton";

/** Metric strip + runs list placeholders, matching the loaded layout. */
export function DashboardBodySkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading runs" className="space-y-6">
      <div className="panel grid grid-cols-2 divide-base-content/[0.07] lg:grid-cols-4 lg:divide-x">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-3 p-4 sm:p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="panel divide-y divide-base-content/[0.07]">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-6 px-4 py-4">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="hidden h-6 w-24 md:block" />
              <Skeleton className="hidden h-3 w-28 md:block" />
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-9 w-72 max-w-full" />
      </div>
      <DashboardBodySkeleton />
    </div>
  );
}

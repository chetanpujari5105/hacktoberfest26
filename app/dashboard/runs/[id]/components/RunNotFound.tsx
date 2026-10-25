import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";
import EmptyState from "@/components/leaseguard/EmptyState";

export default function RunNotFound({ id }: { id?: string }) {
  return (
    <div className="space-y-6">
      <h1 className="sr-only">Run not found</h1>
      <EmptyState
        icon={SearchX}
        title="Run not found"
        action={
          <Link href="/dashboard" className="btn btn-primary btn-sm gap-1.5">
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Back to all runs
          </Link>
        }
      >
        {id ? (
          <>
            No guarded run has the id <span className="num text-base-content">{id}</span>.{" "}
          </>
        ) : (
          "That run id isn't valid. "
        )}
        It may have been removed from LeaseGuard, or the link is wrong.
      </EmptyState>
    </div>
  );
}

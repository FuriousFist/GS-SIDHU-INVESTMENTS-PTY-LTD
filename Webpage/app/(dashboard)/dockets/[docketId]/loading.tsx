import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";

function FieldSkeleton() {
  return (
    <div>
      <Skeleton className="h-4 w-16" />
      <Skeleton className="mt-0.5 h-5 w-28" />
    </div>
  );
}

export default function DocketDetailLoading() {
  return (
    <div aria-busy="true" aria-label="Loading docket">
      <Skeleton className="h-5 w-16" />

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-9 w-24 bg-neutral-300" />
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-4 rounded-lg border border-neutral-200 bg-white p-4 sm:grid-cols-3 sm:p-6">
        {Array.from({ length: 8 }, (_, i) => (
          <FieldSkeleton key={i} />
        ))}
      </dl>

      <h2 className="mt-8 mb-2 text-lg font-semibold text-neutral-900">
        Loads
      </h2>
      <TableSkeleton rows={3} cols={3} />
    </div>
  );
}

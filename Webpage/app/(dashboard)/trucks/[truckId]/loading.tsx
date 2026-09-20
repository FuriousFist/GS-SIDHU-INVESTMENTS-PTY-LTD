import {
  FilterBarSkeleton,
  Skeleton,
  StatTileSkeleton,
  TableSkeleton,
} from "@/components/ui/skeleton";

// The back link, truck heading and details card; the stats/table below
// the filter bar; and the documents table. Also the fallbacks page.tsx
// shows while the truck, a filter change or a documents tab is loading.
export function TruckHeadingSkeleton() {
  return (
    <>
      <Skeleton className="h-5 w-16" />
      <Skeleton className="mt-2 h-8 w-48" />
      <Skeleton className="mt-1 h-5 w-72" />

      {/* Matches TruckDetailsCard: p-4/6 card with a heading and a
          five-column dl of text-xs labels over text-sm values. */}
      <div className="mt-4 rounded-lg border border-neutral-200 bg-white p-4 sm:p-6">
        <Skeleton className="h-6 w-32" />
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i}>
              <Skeleton className="h-3 w-16" />
              <Skeleton className="mt-1.5 h-5 w-24" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export function TruckDocumentsSkeleton() {
  return <TableSkeleton rows={6} cols={4} />;
}

export function TruckResultsSkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatTileSkeleton />
        <StatTileSkeleton />
        <StatTileSkeleton />
        <StatTileSkeleton caption />
        <StatTileSkeleton caption />
        <StatTileSkeleton />
        <StatTileSkeleton />
        <StatTileSkeleton />
      </div>

      <h2 className="mt-8 mb-2 text-lg font-semibold text-neutral-900">
        Dockets
      </h2>
      <TableSkeleton rows={8} cols={7} />
    </>
  );
}

export default function TruckDetailLoading() {
  return (
    <div aria-busy="true" aria-label="Loading truck">
      <TruckHeadingSkeleton />

      <div className="mt-4">
        <FilterBarSkeleton />
      </div>

      <TruckResultsSkeleton />

      <h2 className="mt-8 mb-2 text-lg font-semibold text-neutral-900">
        Documents
      </h2>
      <TruckDocumentsSkeleton />
    </div>
  );
}

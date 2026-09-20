import {
  FilterBarSkeleton,
  StatTileSkeleton,
  TableSkeleton,
} from "@/components/ui/skeleton";

// Everything below the filter bar; also the fallback page.tsx shows while
// a filter change is loading.
export function OverviewResultsSkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatTileSkeleton />
        <StatTileSkeleton />
        <StatTileSkeleton />
        <StatTileSkeleton />
        <StatTileSkeleton caption />
      </div>

      <h2 className="mt-8 mb-2 text-lg font-semibold text-neutral-900">
        Recent dockets
      </h2>
      <TableSkeleton rows={10} cols={7} />
    </>
  );
}

export default function OverviewLoading() {
  return (
    <div aria-busy="true" aria-label="Loading overview">
      <h1 className="text-2xl font-semibold text-neutral-900">Overview</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Operations summary for the selected date range
      </p>

      <div className="mt-4">
        <FilterBarSkeleton />
      </div>

      <OverviewResultsSkeleton />
    </div>
  );
}

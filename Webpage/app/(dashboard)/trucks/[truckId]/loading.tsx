import {
  FilterBarSkeleton,
  Skeleton,
  StatTileSkeleton,
  TableSkeleton,
} from "@/components/ui/skeleton";

export default function TruckDetailLoading() {
  return (
    <div aria-busy="true" aria-label="Loading truck">
      <Skeleton className="h-5 w-16" />
      <Skeleton className="mt-2 h-8 w-48" />
      <Skeleton className="mt-1 h-5 w-72" />

      <div className="mt-4">
        <FilterBarSkeleton />
      </div>

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
    </div>
  );
}

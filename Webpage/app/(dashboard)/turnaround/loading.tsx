import {
  ChartSkeleton,
  FilterBarSkeleton,
  StatTileSkeleton,
  TableSkeleton,
} from "@/components/ui/skeleton";

export default function TurnaroundLoading() {
  return (
    <div aria-busy="true" aria-label="Loading turnaround">
      <h1 className="text-2xl font-semibold text-neutral-900">Turnaround</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Time on site and waiting time for the selected date range
      </p>

      <div className="mt-4">
        <FilterBarSkeleton />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTileSkeleton caption />
        <StatTileSkeleton />
        <StatTileSkeleton caption />
        <StatTileSkeleton />
      </div>

      <div className="mt-4">
        <ChartSkeleton height={200} />
      </div>

      <h2 className="mt-8 mb-2 text-lg font-semibold text-neutral-900">
        Dockets with timing data
      </h2>
      <TableSkeleton rows={8} cols={5} />
    </div>
  );
}

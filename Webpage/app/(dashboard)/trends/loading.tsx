import { ChartSkeleton, FilterBarSkeleton } from "@/components/ui/skeleton";

// The chart cards below the filter bar; also the fallback page.tsx shows
// while a filter change is loading.
export function TrendsResultsSkeleton() {
  return (
    <div className="space-y-4">
      <ChartSkeleton height={220} />
      <ChartSkeleton height={220} />
      <ChartSkeleton height={260} />
    </div>
  );
}

export default function TrendsLoading() {
  return (
    <div aria-busy="true" aria-label="Loading trends">
      <h1 className="text-2xl font-semibold text-neutral-900">Trends</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Daily volume and load counts for the selected date range
      </p>

      <div className="mt-4">
        <FilterBarSkeleton />
      </div>

      <TrendsResultsSkeleton />
    </div>
  );
}

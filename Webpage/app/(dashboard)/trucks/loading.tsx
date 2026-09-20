import { FilterBarSkeleton, TableSkeleton } from "@/components/ui/skeleton";

// The table below the filter bar; also the fallback page.tsx shows while
// a filter change is loading.
export function TrucksResultsSkeleton() {
  return <TableSkeleton rows={8} cols={6} />;
}

export default function TrucksLoading() {
  return (
    <div aria-busy="true" aria-label="Loading trucks">
      <h1 className="text-2xl font-semibold text-neutral-900">Trucks</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Fleet productivity for the selected date range
      </p>

      <div className="mt-4">
        <FilterBarSkeleton />
      </div>

      <TrucksResultsSkeleton />
    </div>
  );
}

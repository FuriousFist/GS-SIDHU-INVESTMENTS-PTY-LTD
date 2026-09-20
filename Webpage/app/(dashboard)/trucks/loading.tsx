import { FilterBarSkeleton, TableSkeleton } from "@/components/ui/skeleton";

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

      <TableSkeleton rows={8} cols={6} />
    </div>
  );
}

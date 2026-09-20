import { FilterBarSkeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function DriversLoading() {
  return (
    <div aria-busy="true" aria-label="Loading drivers">
      <h1 className="text-2xl font-semibold text-neutral-900">Drivers</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Driver data is only reliably captured for some suppliers - treat this
        as indicative, not authoritative.
      </p>

      <div className="mt-4">
        <FilterBarSkeleton />
      </div>

      <TableSkeleton rows={8} cols={4} />
    </div>
  );
}

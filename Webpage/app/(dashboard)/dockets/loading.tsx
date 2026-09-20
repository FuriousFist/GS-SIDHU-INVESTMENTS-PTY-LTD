import { FilterBarSkeleton, Skeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function DocketsLoading() {
  return (
    <div aria-busy="true" aria-label="Loading dockets">
      <h1 className="text-2xl font-semibold text-neutral-900">Dockets</h1>
      <Skeleton className="mt-1 h-5 w-32" />

      <div className="mt-4">
        <FilterBarSkeleton fields={3} search />
      </div>

      <TableSkeleton rows={12} cols={7} />
    </div>
  );
}

import {
  FilterBarSkeleton,
  Skeleton,
  TableSkeleton,
} from "@/components/ui/skeleton";

// The "N dockets found" line and the table; also the fallbacks page.tsx
// shows while a filter change is loading.
export function DocketsCountSkeleton() {
  return <Skeleton className="mt-1 h-5 w-32" />;
}

export function DocketsResultsSkeleton() {
  return <TableSkeleton rows={12} cols={7} />;
}

export default function DocketsLoading() {
  return (
    <div aria-busy="true" aria-label="Loading dockets">
      <h1 className="text-2xl font-semibold text-neutral-900">Dockets</h1>
      <DocketsCountSkeleton />

      <div className="mt-4">
        <FilterBarSkeleton fields={3} search />
      </div>

      <DocketsResultsSkeleton />
    </div>
  );
}

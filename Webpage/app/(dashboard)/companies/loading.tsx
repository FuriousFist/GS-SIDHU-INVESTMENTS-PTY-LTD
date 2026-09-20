import { Skeleton } from "@/components/ui/skeleton";

export default function CompaniesLoading() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Companies</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Supplier contracts and their compliance documents
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 2 }, (_, i) => (
          <div
            key={i}
            className="rounded-lg border border-neutral-200 bg-white p-5"
          >
            <Skeleton className="h-6 w-48" />
            <Skeleton className="mt-2 h-4 w-40" />
            <Skeleton className="mt-4 h-4 w-32" />
            <div className="mt-3 flex gap-2">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

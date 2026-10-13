import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";

// The back link and company card; the Insurance / Other tab contents; and
// the Trucks tab contents. Also the fallbacks page.tsx shows while the
// company or a tab is loading.
export function CompanyHeadingSkeleton() {
  return (
    <>
      <Skeleton className="h-4 w-32" />

      <div className="mt-2 rounded-lg border border-neutral-200 bg-white p-4 sm:p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-2 h-4 w-48" />
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i}>
              <Skeleton className="h-3 w-16" />
              <Skeleton className="mt-1.5 h-5 w-24" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// Matches the AddDocumentForm button above a DocumentTable.
export function CompanyDocumentsSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-[34px] w-32" />
      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200">
              {Array.from({ length: 4 }, (_, i) => (
                <th key={i} className="px-4 py-3">
                  <Skeleton className="h-4 w-16" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }, (_, row) => (
              <tr
                key={row}
                className="border-b border-neutral-100 last:border-0"
              >
                <td className="px-4 py-3">
                  <Skeleton className="h-5 w-48" />
                </td>
                <td className="px-4 py-3">
                  <Skeleton className="h-5 w-24" />
                </td>
                <td className="px-4 py-3">
                  <Skeleton className="h-5 w-20 rounded-full" />
                </td>
                <td className="px-4 py-3">
                  <Skeleton className="h-6 w-56" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CompanyTrucksSkeleton() {
  return <TableSkeleton rows={6} cols={7} />;
}

export default function CompanyLoading() {
  return (
    <div aria-busy="true" aria-label="Loading company">
      <CompanyHeadingSkeleton />

      <div className="mt-6 flex gap-1 border-b border-neutral-200">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="px-3 py-2">
            <Skeleton className="h-5 w-16" />
          </div>
        ))}
      </div>

      <div className="mt-4">
        <CompanyDocumentsSkeleton />
      </div>
    </div>
  );
}

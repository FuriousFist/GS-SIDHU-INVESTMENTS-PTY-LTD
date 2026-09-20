import { Suspense } from "react";
import Link from "next/link";
import { resolveDateRange, type SearchParams } from "@/lib/utils/date-range";
import { listDockets, DOCKETS_PAGE_SIZE } from "@/lib/queries/dockets";
import { DocketFilters } from "@/components/dockets/docket-filters";
import { DocketTable } from "@/components/dockets/docket-table";
import { DocketsCountSkeleton, DocketsResultsSkeleton } from "./loading";

type DocketsResult = Awaited<ReturnType<typeof listDockets>>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DocketsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { from, to } = resolveDateRange(params);
  const docketType = firstParam(params.type) || undefined;
  const search = firstParam(params.q) || undefined;
  const page = Math.max(1, Number(firstParam(params.page)) || 1);

  // One query shared by the count line and the table below the filters.
  const result = listDockets({ from, to, docketType, search, page });

  // Keyed on the filters so a filter change mounts fresh boundaries and
  // shows the skeletons, rather than holding the stale results on screen
  // until the new data arrives (loading.tsx only covers route changes).
  const key = [from, to, docketType ?? "", search ?? "", page].join(":");

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Dockets</h1>
      <Suspense key={`count:${key}`} fallback={<DocketsCountSkeleton />}>
        <DocketCount result={result} />
      </Suspense>

      <div className="mt-4">
        <DocketFilters
          from={from}
          to={to}
          docketType={docketType}
          search={search}
          pathname="/dockets"
        />
      </div>

      <Suspense key={`results:${key}`} fallback={<DocketsResultsSkeleton />}>
        <DocketResults
          result={result}
          from={from}
          to={to}
          docketType={docketType}
          search={search}
          page={page}
        />
      </Suspense>
    </div>
  );
}

async function DocketCount({ result }: { result: Promise<DocketsResult> }) {
  const { total } = await result;

  return (
    <p className="mt-1 text-sm text-neutral-500">
      {total} docket{total === 1 ? "" : "s"} found
    </p>
  );
}

async function DocketResults({
  result,
  from,
  to,
  docketType,
  search,
  page,
}: {
  result: Promise<DocketsResult>;
  from: string;
  to: string;
  docketType?: string;
  search?: string;
  page: number;
}) {
  const { dockets, total } = await result;

  const totalPages = Math.max(1, Math.ceil(total / DOCKETS_PAGE_SIZE));

  const pageHref = (targetPage: number) => {
    const query = new URLSearchParams({
      from,
      to,
      ...(docketType ? { type: docketType } : {}),
      ...(search ? { q: search } : {}),
      page: String(targetPage),
    });
    return `/dockets?${query.toString()}`;
  };

  const pageLinkClasses =
    "rounded-md border border-neutral-300 px-3 py-1.5 transition-colors hover:bg-neutral-100 active:scale-[0.98] active:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900";

  return (
    <>
      <DocketTable dockets={dockets} />

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-neutral-600">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={pageHref(page - 1)} className={pageLinkClasses}>
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link href={pageHref(page + 1)} className={pageLinkClasses}>
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}

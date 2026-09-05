import Link from "next/link";
import { resolveDateRange, type SearchParams } from "@/lib/utils/date-range";
import { listDockets, DOCKETS_PAGE_SIZE } from "@/lib/queries/dockets";
import { DocketFilters } from "@/components/dockets/docket-filters";
import { DocketTable } from "@/components/dockets/docket-table";

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

  const { dockets, total } = await listDockets({
    from,
    to,
    docketType,
    search,
    page,
  });

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

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Dockets</h1>
      <p className="mt-1 text-sm text-neutral-500">
        {total} docket{total === 1 ? "" : "s"} found
      </p>

      <div className="mt-4">
        <DocketFilters
          from={from}
          to={to}
          docketType={docketType}
          search={search}
        />
      </div>

      <DocketTable dockets={dockets} />

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-neutral-600">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={pageHref(page - 1)}
                className="rounded-md border border-neutral-300 px-3 py-1.5 hover:bg-neutral-100"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={pageHref(page + 1)}
                className="rounded-md border border-neutral-300 px-3 py-1.5 hover:bg-neutral-100"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

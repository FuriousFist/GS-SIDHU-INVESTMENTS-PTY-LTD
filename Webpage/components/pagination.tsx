import Link from "next/link";

const pageLinkClasses =
  "rounded-md border border-neutral-300 px-3 py-1.5 transition-colors hover:bg-neutral-100 active:scale-[0.98] active:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900";

export function Pagination({
  page,
  totalPages,
  pageHref,
}: {
  page: number;
  totalPages: number;
  pageHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  return (
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
  );
}

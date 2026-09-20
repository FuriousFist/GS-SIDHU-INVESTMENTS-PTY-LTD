// Loading placeholders used by each route's loading.tsx. The composed
// helpers mirror the real components' wrappers, padding and heights
// (StatTile, DocketTable/other tables, the chart cards, the filter bars)
// so the layout doesn't jump when the data arrives.

function joinClasses(...parts: (string | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      aria-hidden="true"
      style={style}
      className={joinClasses("animate-pulse rounded bg-neutral-200", className)}
    />
  );
}

// Matches StatTile: p-5 card, text-xs label, mt-2 text-2xl value, optional
// mt-1 text-xs caption.
export function StatTileSkeleton({ caption = false }: { caption?: boolean }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-2 h-8 w-20" />
      {caption && <Skeleton className="mt-1 h-4 w-32" />}
    </div>
  );
}

// Matches the table cards: a header row of text-xs uppercase headings and
// body rows of text-sm cells, all px-4 py-3.
export function TableSkeleton({
  rows = 8,
  cols = 5,
}: {
  rows?: number;
  cols?: number;
}) {
  const colIndexes = Array.from({ length: cols }, (_, i) => i);

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200">
            {colIndexes.map((col) => (
              <th key={col} className="px-4 py-3">
                <Skeleton className="h-4 w-16" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, row) => (
            <tr
              key={row}
              className="border-b border-neutral-100 last:border-0"
            >
              {colIndexes.map((col) => (
                <td key={col} className="px-4 py-3">
                  <Skeleton
                    className={joinClasses(
                      "h-5",
                      col === 0 ? "w-20" : col % 2 === 0 ? "w-24" : "w-16"
                    )}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Matches the chart cards: p-5 card with a text-sm heading above a
// fixed-height Recharts ResponsiveContainer.
export function ChartSkeleton({ height = 220 }: { height?: number }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="mt-2 w-full" style={{ height }} />
    </div>
  );
}

// Matches DateRangeFilter / DocketFilters: a p-4 card of labelled inputs
// (text-xs label, py-1.5 text-sm input) ending in the Apply button.
export function FilterBarSkeleton({
  fields = 2,
  search = false,
}: {
  fields?: number;
  search?: boolean;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-neutral-200 bg-white p-4">
      {Array.from({ length: fields }, (_, i) => (
        <div key={i}>
          <Skeleton className="mb-1 h-4 w-10" />
          <Skeleton className="h-[34px] w-36" />
        </div>
      ))}
      {search && (
        <div className="flex-1 min-w-[180px]">
          <Skeleton className="mb-1 h-4 w-40" />
          <Skeleton className="h-[34px] w-full" />
        </div>
      )}
      <Skeleton className="h-[34px] w-[70px] bg-neutral-300" />
    </div>
  );
}

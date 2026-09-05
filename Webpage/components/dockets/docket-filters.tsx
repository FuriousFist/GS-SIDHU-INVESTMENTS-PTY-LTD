export function DocketFilters({
  from,
  to,
  docketType,
  search,
}: {
  from: string;
  to: string;
  docketType?: string;
  search?: string;
}) {
  return (
    <form
      method="GET"
      className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-neutral-200 bg-white p-4"
    >
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600">
          From
        </label>
        <input
          type="date"
          name="from"
          defaultValue={from}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600">
          To
        </label>
        <input
          type="date"
          name="to"
          defaultValue={to}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600">
          Type
        </label>
        <select
          name="type"
          defaultValue={docketType ?? ""}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        >
          <option value="">All</option>
          <option value="concrete">Concrete</option>
          <option value="aggregates">Aggregates</option>
        </select>
      </div>

      <div className="flex-1 min-w-[180px]">
        <label className="mb-1 block text-xs font-medium text-neutral-600">
          Search (docket # or customer)
        </label>
        <input
          type="text"
          name="q"
          defaultValue={search ?? ""}
          placeholder="e.g. 13156202 or Winslow"
          className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </div>

      <button
        type="submit"
        className="rounded-md bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
      >
        Apply
      </button>
    </form>
  );
}

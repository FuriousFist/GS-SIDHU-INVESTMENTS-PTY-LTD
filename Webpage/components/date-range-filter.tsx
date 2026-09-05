export function DateRangeFilter({ from, to }: { from: string; to: string }) {
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

      <button
        type="submit"
        className="rounded-md bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
      >
        Apply
      </button>
    </form>
  );
}

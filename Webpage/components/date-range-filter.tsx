import { FilterInput } from "@/components/ui/filter-input";

export function DateRangeFilter({ from, to }: { from: string; to: string }) {
  return (
    <form
      method="GET"
      className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-neutral-200 bg-white p-4"
    >
      <div>
        <label
          htmlFor="date-range-from"
          className="mb-1 block text-xs font-medium text-neutral-600"
        >
          From
        </label>
        <FilterInput
          id="date-range-from"
          type="date"
          name="from"
          defaultValue={from}
        />
      </div>

      <div>
        <label
          htmlFor="date-range-to"
          className="mb-1 block text-xs font-medium text-neutral-600"
        >
          To
        </label>
        <FilterInput
          id="date-range-to"
          type="date"
          name="to"
          defaultValue={to}
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

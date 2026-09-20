import Form from "next/form";
import { ApplyButton } from "@/components/ui/apply-button";
import { FilterInput, FilterSelect } from "@/components/ui/filter-input";

// `pathname` is the route to submit to (the page's own path). next/form
// turns the submit into a client-side navigation with the fields encoded
// as search params, so the route's loading.tsx shows while data loads.
export function DocketFilters({
  from,
  to,
  docketType,
  search,
  pathname,
}: {
  from: string;
  to: string;
  docketType?: string;
  search?: string;
  pathname: string;
}) {
  return (
    <Form
      action={pathname}
      className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-neutral-200 bg-white p-4"
    >
      <div>
        <label
          htmlFor="docket-filters-from"
          className="mb-1 block text-xs font-medium text-neutral-600"
        >
          From
        </label>
        <FilterInput
          id="docket-filters-from"
          type="date"
          name="from"
          defaultValue={from}
        />
      </div>

      <div>
        <label
          htmlFor="docket-filters-to"
          className="mb-1 block text-xs font-medium text-neutral-600"
        >
          To
        </label>
        <FilterInput
          id="docket-filters-to"
          type="date"
          name="to"
          defaultValue={to}
        />
      </div>

      <div>
        <label
          htmlFor="docket-filters-type"
          className="mb-1 block text-xs font-medium text-neutral-600"
        >
          Type
        </label>
        <FilterSelect
          id="docket-filters-type"
          name="type"
          defaultValue={docketType ?? ""}
        >
          <option value="">All</option>
          <option value="concrete">Concrete</option>
          <option value="aggregates">Aggregates</option>
        </FilterSelect>
      </div>

      <div className="flex-1 min-w-[180px]">
        <label
          htmlFor="docket-filters-search"
          className="mb-1 block text-xs font-medium text-neutral-600"
        >
          Search (docket # or customer)
        </label>
        <FilterInput
          id="docket-filters-search"
          type="text"
          name="q"
          defaultValue={search ?? ""}
          placeholder="e.g. 13156202 or Winslow"
          className="w-full"
        />
      </div>

      <ApplyButton />
    </Form>
  );
}

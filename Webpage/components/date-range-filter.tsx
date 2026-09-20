import Form from "next/form";
import { ApplyButton } from "@/components/ui/apply-button";
import { FilterInput } from "@/components/ui/filter-input";

// `pathname` is the route to submit to (the page's own path). next/form
// turns the submit into a client-side navigation with the fields encoded
// as search params, so the route's loading.tsx shows while data loads.
export function DateRangeFilter({
  from,
  to,
  pathname,
}: {
  from: string;
  to: string;
  pathname: string;
}) {
  return (
    <Form
      action={pathname}
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

      <ApplyButton />
    </Form>
  );
}

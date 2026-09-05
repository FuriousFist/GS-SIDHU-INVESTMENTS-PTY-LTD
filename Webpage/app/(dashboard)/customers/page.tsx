import { resolveDateRange, type SearchParams } from "@/lib/utils/date-range";
import { getCustomerSummary } from "@/lib/queries/customers";
import { DateRangeFilter } from "@/components/date-range-filter";
import { formatDate, formatQuantity } from "@/lib/utils/format";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { from, to } = resolveDateRange(params);
  const customers = await getCustomerSummary(from, to);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Customers</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Volume delivered by customer for the selected date range
      </p>

      <div className="mt-4">
        <DateRangeFilter from={from} to={to} />
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs font-medium uppercase text-neutral-500">
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3 text-right">Dockets</th>
              <th className="px-4 py-3 text-right">Concrete (m³)</th>
              <th className="px-4 py-3 text-right">Aggregates (t)</th>
              <th className="px-4 py-3">Last delivery</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr
                key={customer.customer_name}
                className="border-b border-neutral-100 last:border-0"
              >
                <td className="px-4 py-3 font-medium text-neutral-900">
                  {customer.customer_name}
                </td>
                <td className="px-4 py-3 text-right text-neutral-600">
                  {customer.docket_count}
                </td>
                <td className="px-4 py-3 text-right text-neutral-600">
                  {formatQuantity(customer.total_concrete_m3, "m3")}
                </td>
                <td className="px-4 py-3 text-right text-neutral-600">
                  {formatQuantity(customer.total_aggregates_tonnes, "tonnes")}
                </td>
                <td className="px-4 py-3 text-neutral-600">
                  {formatDate(customer.last_docket_date)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

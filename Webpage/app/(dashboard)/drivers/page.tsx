import { resolveDateRange, type SearchParams } from "@/lib/utils/date-range";
import { getDriverSummary } from "@/lib/queries/drivers";
import { DateRangeFilter } from "@/components/date-range-filter";
import { formatQuantity } from "@/lib/utils/format";

export default async function DriversPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { from, to } = resolveDateRange(params);
  const drivers = await getDriverSummary(from, to);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Drivers</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Driver data is only reliably captured for some suppliers - treat this
        as indicative, not authoritative.
      </p>

      <div className="mt-4">
        <DateRangeFilter from={from} to={to} />
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs font-medium uppercase text-neutral-500">
              <th className="px-4 py-3">Driver</th>
              <th className="px-4 py-3 text-right">Dockets</th>
              <th className="px-4 py-3 text-right">Concrete (m³)</th>
              <th className="px-4 py-3 text-right">Aggregates (t)</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((driver) => (
              <tr
                key={driver.driverName}
                className="border-b border-neutral-100 last:border-0"
              >
                <td className="px-4 py-3 font-medium text-neutral-900">
                  {driver.driverName}
                </td>
                <td className="px-4 py-3 text-right text-neutral-600">
                  {driver.docketCount}
                </td>
                <td className="px-4 py-3 text-right text-neutral-600">
                  {formatQuantity(driver.totalM3, "m3")}
                </td>
                <td className="px-4 py-3 text-right text-neutral-600">
                  {formatQuantity(driver.totalTonnes, "tonnes")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

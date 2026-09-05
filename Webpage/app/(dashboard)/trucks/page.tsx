import { resolveDateRange, type SearchParams } from "@/lib/utils/date-range";
import { getTruckSummary } from "@/lib/queries/trucks";
import { DateRangeFilter } from "@/components/date-range-filter";
import { TruckRow } from "@/components/trucks/truck-row";

export default async function TrucksPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { from, to } = resolveDateRange(params);
  const trucks = await getTruckSummary(from, to);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Trucks</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Fleet productivity for the selected date range
      </p>

      <div className="mt-4">
        <DateRangeFilter from={from} to={to} />
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs font-medium uppercase text-neutral-500">
              <th className="px-4 py-3">Truck</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3 text-right">Dockets</th>
              <th className="px-4 py-3 text-right">Concrete (m³)</th>
              <th className="px-4 py-3 text-right">Aggregates (t)</th>
              <th className="px-4 py-3">Last active</th>
            </tr>
          </thead>
          <tbody>
            {trucks.map((truck) => (
              <TruckRow
                key={truck.truck_id ?? "unassigned"}
                truck={truck}
                from={from}
                to={to}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

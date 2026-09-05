import { resolveDateRange, type SearchParams } from "@/lib/utils/date-range";
import { getPlantSummary } from "@/lib/queries/plants";
import { DateRangeFilter } from "@/components/date-range-filter";
import { formatDate, formatQuantity } from "@/lib/utils/format";

export default async function PlantsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { from, to } = resolveDateRange(params);
  const plants = await getPlantSummary(from, to);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Plants</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Volume dispatched by plant for the selected date range
      </p>

      <div className="mt-4">
        <DateRangeFilter from={from} to={to} />
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs font-medium uppercase text-neutral-500">
              <th className="px-4 py-3">Plant</th>
              <th className="px-4 py-3 text-right">Dockets</th>
              <th className="px-4 py-3 text-right">Concrete (m³)</th>
              <th className="px-4 py-3 text-right">Aggregates (t)</th>
              <th className="px-4 py-3">Last dispatch</th>
            </tr>
          </thead>
          <tbody>
            {plants.map((plant) => (
              <tr
                key={plant.plant_name}
                className="border-b border-neutral-100 last:border-0"
              >
                <td className="px-4 py-3 font-medium text-neutral-900">
                  {plant.plant_name}
                </td>
                <td className="px-4 py-3 text-right text-neutral-600">
                  {plant.docket_count}
                </td>
                <td className="px-4 py-3 text-right text-neutral-600">
                  {formatQuantity(plant.total_concrete_m3, "m3")}
                </td>
                <td className="px-4 py-3 text-right text-neutral-600">
                  {formatQuantity(plant.total_aggregates_tonnes, "tonnes")}
                </td>
                <td className="px-4 py-3 text-neutral-600">
                  {formatDate(plant.last_docket_date)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

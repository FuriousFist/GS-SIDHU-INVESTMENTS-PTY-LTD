import { resolveDateRange, type SearchParams } from "@/lib/utils/date-range";
import { getDailyVolume } from "@/lib/queries/trends";
import { DateRangeFilter } from "@/components/date-range-filter";
import { VolumeTrendChart } from "@/components/charts/volume-trend-chart";
import { LoadCountChart } from "@/components/charts/load-count-chart";

const CONCRETE_COLOR = "#2a78d6";
const AGGREGATES_COLOR = "#eb6834";

export default async function TrendsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { from, to } = resolveDateRange(params);
  const daily = await getDailyVolume(from, to);

  const hasData = daily.length > 0;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Trends</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Daily volume and load counts for the selected date range
      </p>

      <div className="mt-4">
        <DateRangeFilter from={from} to={to} />
      </div>

      {!hasData ? (
        <p className="rounded-lg border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500">
          No dockets in this date range.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-neutral-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-neutral-900">
              Concrete volume (m³)
            </h2>
            <VolumeTrendChart
              data={daily.map((d) => ({ date: d.date, value: d.concreteM3 }))}
              color={CONCRETE_COLOR}
              unitLabel="m³"
            />
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-neutral-900">
              Aggregates volume (t)
            </h2>
            <VolumeTrendChart
              data={daily.map((d) => ({
                date: d.date,
                value: d.aggregatesTonnes,
              }))}
              color={AGGREGATES_COLOR}
              unitLabel="t"
            />
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-neutral-900">
              Dockets per day
            </h2>
            <LoadCountChart data={daily} />
          </div>
        </div>
      )}
    </div>
  );
}

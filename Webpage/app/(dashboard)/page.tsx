import { resolveDateRange, type SearchParams } from "@/lib/utils/date-range";
import { getOverviewData } from "@/lib/queries/overview";
import { DateRangeFilter } from "@/components/date-range-filter";
import { StatTile } from "@/components/stat-tile";
import { DocketTable } from "@/components/dockets/docket-table";
import { formatMinutes } from "@/lib/utils/format";

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { from, to } = resolveDateRange(params);

  const {
    totalDockets,
    totalConcreteM3,
    totalAggregatesTonnes,
    activeTrucks,
    recentDockets,
    turnaround,
  } = await getOverviewData(from, to);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Overview</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Operations summary for the selected date range
      </p>

      <div className="mt-4">
        <DateRangeFilter from={from} to={to} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile label="Dockets" value={totalDockets.toLocaleString()} />
        <StatTile
          label="Concrete delivered"
          value={`${totalConcreteM3.toLocaleString()} m³`}
        />
        <StatTile
          label="Aggregates delivered"
          value={`${totalAggregatesTonnes.toLocaleString()} t`}
        />
        <StatTile label="Active trucks" value={activeTrucks.toString()} />
        <StatTile
          label="Avg. time on site"
          value={formatMinutes(turnaround?.avg_site_minutes ?? null)}
          caption={
            turnaround
              ? `Based on ${turnaround.timed_docket_count} of ${turnaround.docket_count} dockets`
              : undefined
          }
        />
      </div>

      <h2 className="mt-8 mb-2 text-lg font-semibold text-neutral-900">
        Recent dockets
      </h2>
      <DocketTable dockets={recentDockets} />
    </div>
  );
}

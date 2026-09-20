import { Suspense } from "react";
import { resolveDateRange, type SearchParams } from "@/lib/utils/date-range";
import { getOverviewData } from "@/lib/queries/overview";
import { DateRangeFilter } from "@/components/date-range-filter";
import { StatTile } from "@/components/stat-tile";
import { DocketTable } from "@/components/dockets/docket-table";
import { formatMinutes } from "@/lib/utils/format";
import { OverviewResultsSkeleton } from "./loading";

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { from, to } = resolveDateRange(params);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Overview</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Operations summary for the selected date range
      </p>

      <div className="mt-4">
        <DateRangeFilter from={from} to={to} pathname="/" />
      </div>

      {/* Keyed on the filters so a filter change mounts a fresh boundary and
          shows the skeleton, rather than holding the stale results on screen
          until the new data arrives (loading.tsx only covers route changes). */}
      <Suspense key={`${from}:${to}`} fallback={<OverviewResultsSkeleton />}>
        <OverviewResults from={from} to={to} />
      </Suspense>
    </div>
  );
}

async function OverviewResults({ from, to }: { from: string; to: string }) {
  const {
    totalDockets,
    totalConcreteM3,
    totalAggregatesTonnes,
    activeTrucks,
    recentDockets,
    turnaround,
  } = await getOverviewData(from, to);

  return (
    <>
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
    </>
  );
}

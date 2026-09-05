import { notFound } from "next/navigation";
import { resolveDateRange, type SearchParams } from "@/lib/utils/date-range";
import { getTruckDockets } from "@/lib/queries/trucks";
import { DateRangeFilter } from "@/components/date-range-filter";
import { StatTile } from "@/components/stat-tile";
import { DocketTable } from "@/components/dockets/docket-table";
import { BackLink } from "@/components/back-link";
import {
  formatDate,
  formatMinutes,
  parseIntervalMinutes,
} from "@/lib/utils/format";

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export default async function TruckDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ truckId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { truckId } = await params;
  const { from, to } = resolveDateRange(await searchParams);

  let result;
  try {
    result = await getTruckDockets(truckId, from, to);
  } catch {
    notFound();
  }

  const { truck, dockets } = result;

  const totalConcreteM3 = dockets.reduce(
    (sum, d) => sum + (d.docket_type === "concrete" ? d.total_m3 ?? 0 : 0),
    0
  );
  const totalAggregatesTonnes = dockets.reduce(
    (sum, d) =>
      sum + (d.docket_type === "aggregates" ? d.total_tonnes ?? 0 : 0),
    0
  );
  const totalLoads = dockets.reduce((sum, d) => sum + (d.load_count ?? 0), 0);

  const hasConcrete = dockets.some((d) => d.docket_type === "concrete");
  const hasAggregates = dockets.some((d) => d.docket_type === "aggregates");

  const siteMinutes = dockets
    .map((d) => parseIntervalMinutes(d.total_time_on_site))
    .filter((v): v is number => v !== null);
  const waitMinutes = dockets
    .map((d) => parseIntervalMinutes(d.waiting_time))
    .filter((v): v is number => v !== null);

  const customerCount = new Set(
    dockets.map((d) => d.customer_name).filter(Boolean)
  ).size;
  const plantCount = new Set(dockets.map((d) => d.plant_name).filter(Boolean))
    .size;

  const lastActive = dockets.reduce<string | null>((latest, d) => {
    if (!d.docket_date) return latest;
    if (!latest || d.docket_date > latest) return d.docket_date;
    return latest;
  }, null);

  return (
    <div>
      <BackLink fallbackHref="/trucks">&larr; Back</BackLink>

      <h1 className="mt-2 text-2xl font-semibold text-neutral-900">
        Truck {truck.truck_number}
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        {truck.company ?? "Unknown company"} &middot;{" "}
        {truck.registration ?? "No registration on file"} &middot;{" "}
        {truck.active ? "Active" : "Inactive"}
      </p>

      <div className="mt-4">
        <DateRangeFilter from={from} to={to} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatTile label="Dockets" value={dockets.length.toLocaleString()} />
        <StatTile label="Total loads" value={totalLoads.toLocaleString()} />
        {hasConcrete && (
          <StatTile
            label="Concrete delivered"
            value={`${totalConcreteM3.toLocaleString()} m³`}
          />
        )}
        {hasAggregates && (
          <StatTile
            label="Aggregates delivered"
            value={`${totalAggregatesTonnes.toLocaleString()} t`}
          />
        )}
        <StatTile
          label="Avg. time on site"
          value={formatMinutes(average(siteMinutes))}
          caption={`Based on ${siteMinutes.length} of ${dockets.length} dockets`}
        />
        <StatTile
          label="Avg. waiting time"
          value={formatMinutes(average(waitMinutes))}
          caption={`Based on ${waitMinutes.length} of ${dockets.length} dockets`}
        />
        <StatTile label="Customers served" value={customerCount.toString()} />
        <StatTile label="Plants used" value={plantCount.toString()} />
        <StatTile
          label="Last active"
          value={lastActive ? formatDate(lastActive) : "-"}
        />
      </div>

      <h2 className="mt-8 mb-2 text-lg font-semibold text-neutral-900">
        Dockets
      </h2>
      <DocketTable dockets={dockets} />
    </div>
  );
}

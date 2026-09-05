import { resolveDateRange, type SearchParams } from "@/lib/utils/date-range";
import { getTurnaroundData } from "@/lib/queries/turnaround";
import { DateRangeFilter } from "@/components/date-range-filter";
import { StatTile } from "@/components/stat-tile";
import { TurnaroundHistogram } from "@/components/charts/turnaround-histogram";
import { ClickableRow } from "@/components/clickable-row";
import { formatDate, formatMinutes } from "@/lib/utils/format";

export default async function TurnaroundPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { from, to } = resolveDateRange(params);
  const { dockets, totalDockets, siteStats, waitStats } =
    await getTurnaroundData(from, to);

  const siteMinutesValues = dockets
    .map((d) => d.siteMinutes)
    .filter((v): v is number => v !== null);

  const timedDockets = dockets
    .filter((d) => d.siteMinutes !== null || d.waitMinutes !== null)
    .sort((a, b) => (b.docket_date ?? "").localeCompare(a.docket_date ?? ""));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Turnaround</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Time on site and waiting time for the selected date range
      </p>

      <div className="mt-4">
        <DateRangeFilter from={from} to={to} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile
          label="Avg. time on site"
          value={formatMinutes(siteStats.avg)}
          caption={`Based on ${siteStats.count} of ${totalDockets} dockets`}
        />
        <StatTile
          label="Median time on site"
          value={formatMinutes(siteStats.median)}
        />
        <StatTile
          label="Avg. waiting time"
          value={formatMinutes(waitStats.avg)}
          caption={`Based on ${waitStats.count} of ${totalDockets} dockets`}
        />
        <StatTile
          label="Median waiting time"
          value={formatMinutes(waitStats.median)}
        />
      </div>

      {siteMinutesValues.length > 0 && (
        <div className="mt-4 rounded-lg border border-neutral-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-neutral-900">
            Time on site distribution
          </h2>
          <TurnaroundHistogram minutes={siteMinutesValues} />
        </div>
      )}

      <h2 className="mt-8 mb-2 text-lg font-semibold text-neutral-900">
        Dockets with timing data
      </h2>

      {timedDockets.length === 0 ? (
        <p className="rounded-lg border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500">
          No dockets in this range have timing data captured.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs font-medium uppercase text-neutral-500">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Docket #</th>
                <th className="px-4 py-3">Truck</th>
                <th className="px-4 py-3 text-right">Time on site</th>
                <th className="px-4 py-3 text-right">Waiting time</th>
              </tr>
            </thead>
            <tbody>
              {timedDockets.map((d) => (
                <ClickableRow
                  key={d.id}
                  href={`/dockets/${d.id}`}
                  className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50"
                >
                  <td className="px-4 py-3 text-neutral-600">
                    {formatDate(d.docket_date)}
                  </td>
                  <td className="px-4 py-3 font-medium text-neutral-900">
                    {d.docket_number}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {d.truck_number ?? "Unassigned"}
                  </td>
                  <td className="px-4 py-3 text-right text-neutral-600">
                    {formatMinutes(d.siteMinutes)}
                  </td>
                  <td className="px-4 py-3 text-right text-neutral-600">
                    {formatMinutes(d.waitMinutes)}
                  </td>
                </ClickableRow>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

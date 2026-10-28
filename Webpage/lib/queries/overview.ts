import { createClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/queries/fetch-all";
import { average } from "@/lib/queries/turnaround";
import { parseIntervalMinutes } from "@/lib/utils/format";

export async function getOverviewData(from: string, to: string) {
  const supabase = await createClient();

  const { data: dockets, error: docketsError } = await fetchAllRows(
    (start, end) =>
      supabase
        .from("docket_summary")
        .select("docket_type, total_m3, total_tonnes, truck_number, total_time_on_site")
        .gte("docket_date", from)
        .lte("docket_date", to)
        .order("id")
        .range(start, end)
  );

  if (docketsError) {
    throw new Error(`Failed to load overview data: ${docketsError.message}`);
  }

  const totalDockets = dockets.length;
  const totalConcreteM3 = dockets.reduce(
    (sum, d) => sum + (d.docket_type === "concrete" ? d.total_m3 ?? 0 : 0),
    0
  );
  const totalAggregatesTonnes = dockets.reduce(
    (sum, d) =>
      sum + (d.docket_type === "aggregates" ? d.total_tonnes ?? 0 : 0),
    0
  );
  const activeTrucks = new Set(
    dockets.map((d) => d.truck_number).filter(Boolean)
  ).size;

  const siteMinutes = dockets
    .map((d) => parseIntervalMinutes(d.total_time_on_site))
    .filter((v): v is number => v !== null);

  const { data: recentDockets, error: recentError } = await supabase
    .from("docket_summary")
    .select("*")
    .gte("docket_date", from)
    .lte("docket_date", to)
    .order("docket_date", { ascending: false })
    .limit(10);

  if (recentError) {
    throw new Error(`Failed to load recent dockets: ${recentError.message}`);
  }

  return {
    totalDockets,
    totalConcreteM3,
    totalAggregatesTonnes,
    activeTrucks,
    recentDockets: recentDockets ?? [],
    siteStats: { count: siteMinutes.length, avg: average(siteMinutes) },
  };
}

import { createClient } from "@/lib/supabase/server";

export async function getOverviewData(from: string, to: string) {
  const supabase = await createClient();

  const { data: dockets, error: docketsError } = await supabase
    .from("docket_summary")
    .select("docket_type, total_m3, total_tonnes, truck_number")
    .gte("docket_date", from)
    .lte("docket_date", to);

  if (docketsError) {
    throw new Error(`Failed to load overview data: ${docketsError.message}`);
  }

  const totalDockets = dockets?.length ?? 0;
  const totalConcreteM3 = (dockets ?? []).reduce(
    (sum, d) => sum + (d.docket_type === "concrete" ? d.total_m3 ?? 0 : 0),
    0
  );
  const totalAggregatesTonnes = (dockets ?? []).reduce(
    (sum, d) =>
      sum + (d.docket_type === "aggregates" ? d.total_tonnes ?? 0 : 0),
    0
  );
  const activeTrucks = new Set(
    (dockets ?? []).map((d) => d.truck_number).filter(Boolean)
  ).size;

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

  const { data: turnaround, error: turnaroundError } = await supabase
    .rpc("get_turnaround_stats", { date_from: from, date_to: to })
    .single();

  if (turnaroundError) {
    throw new Error(
      `Failed to load turnaround stats: ${turnaroundError.message}`
    );
  }

  return {
    totalDockets,
    totalConcreteM3,
    totalAggregatesTonnes,
    activeTrucks,
    recentDockets: recentDockets ?? [],
    turnaround,
  };
}

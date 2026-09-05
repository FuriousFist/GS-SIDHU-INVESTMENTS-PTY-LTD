import { createClient } from "@/lib/supabase/server";

export async function getDriverSummary(from: string, to: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("docket_summary")
    .select("driver_name, docket_type, total_m3, total_tonnes")
    .gte("docket_date", from)
    .lte("docket_date", to);

  if (error) {
    throw new Error(`Failed to load driver summary: ${error.message}`);
  }

  const byDriver = new Map<
    string,
    {
      driverName: string;
      docketCount: number;
      totalM3: number;
      totalTonnes: number;
    }
  >();

  for (const row of data ?? []) {
    const key = row.driver_name ?? "Unknown / not captured";
    const entry = byDriver.get(key) ?? {
      driverName: key,
      docketCount: 0,
      totalM3: 0,
      totalTonnes: 0,
    };

    entry.docketCount += 1;
    if (row.docket_type === "concrete") entry.totalM3 += row.total_m3 ?? 0;
    if (row.docket_type === "aggregates")
      entry.totalTonnes += row.total_tonnes ?? 0;

    byDriver.set(key, entry);
  }

  return Array.from(byDriver.values()).sort(
    (a, b) => b.docketCount - a.docketCount
  );
}

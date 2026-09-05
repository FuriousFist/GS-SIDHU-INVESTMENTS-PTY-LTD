import { createClient } from "@/lib/supabase/server";

export type DailyVolumePoint = {
  date: string;
  concreteM3: number;
  aggregatesTonnes: number;
  concreteLoads: number;
  aggregatesLoads: number;
};

export async function getDailyVolume(
  from: string,
  to: string
): Promise<DailyVolumePoint[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_daily_volume", {
    date_from: from,
    date_to: to,
  });

  if (error) {
    throw new Error(`Failed to load daily volume: ${error.message}`);
  }

  const byDate = new Map<string, DailyVolumePoint>();

  for (const row of data ?? []) {
    if (!row.docket_date) continue;

    const point = byDate.get(row.docket_date) ?? {
      date: row.docket_date,
      concreteM3: 0,
      aggregatesTonnes: 0,
      concreteLoads: 0,
      aggregatesLoads: 0,
    };

    if (row.docket_type === "concrete") {
      point.concreteM3 += row.total_quantity ?? 0;
      point.concreteLoads += row.load_count ?? 0;
    } else if (row.docket_type === "aggregates") {
      point.aggregatesTonnes += row.total_quantity ?? 0;
      point.aggregatesLoads += row.load_count ?? 0;
    }

    byDate.set(row.docket_date, point);
  }

  return Array.from(byDate.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
}

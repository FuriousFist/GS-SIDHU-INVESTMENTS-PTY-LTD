import { createClient } from "@/lib/supabase/server";
import { parseIntervalMinutes } from "@/lib/utils/format";

export type TimedDocket = {
  id: string;
  docket_number: string;
  docket_type: string;
  docket_date: string | null;
  truck_number: string | null;
  siteMinutes: number | null;
  waitMinutes: number | null;
};

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export async function getTurnaroundData(from: string, to: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("docket_summary")
    .select(
      "id, docket_number, docket_type, docket_date, truck_number, total_time_on_site, waiting_time"
    )
    .gte("docket_date", from)
    .lte("docket_date", to);

  if (error) {
    throw new Error(`Failed to load turnaround data: ${error.message}`);
  }

  const dockets: TimedDocket[] = (data ?? [])
    .filter((d): d is typeof d & { id: string } => d.id !== null)
    .map((d) => ({
      id: d.id,
      docket_number: d.docket_number ?? "-",
      docket_type: d.docket_type ?? "-",
      docket_date: d.docket_date,
      truck_number: d.truck_number,
      siteMinutes: parseIntervalMinutes(d.total_time_on_site),
      waitMinutes: parseIntervalMinutes(d.waiting_time),
    }));

  const siteMinutesValues = dockets
    .map((d) => d.siteMinutes)
    .filter((v): v is number => v !== null);

  const waitMinutesValues = dockets
    .map((d) => d.waitMinutes)
    .filter((v): v is number => v !== null);

  return {
    dockets,
    totalDockets: dockets.length,
    siteStats: {
      count: siteMinutesValues.length,
      avg: average(siteMinutesValues),
      median: median(siteMinutesValues),
    },
    waitStats: {
      count: waitMinutesValues.length,
      avg: average(waitMinutesValues),
      median: median(waitMinutesValues),
    },
  };
}

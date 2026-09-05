import { createClient } from "@/lib/supabase/server";

export async function getPlantSummary(from: string, to: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_plant_summary", {
    date_from: from,
    date_to: to,
  });

  if (error) {
    throw new Error(`Failed to load plant summary: ${error.message}`);
  }

  return data ?? [];
}

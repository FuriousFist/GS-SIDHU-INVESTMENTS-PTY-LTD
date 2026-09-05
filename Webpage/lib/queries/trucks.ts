import { createClient } from "@/lib/supabase/server";

export async function getTruckSummary(from: string, to: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_truck_summary", {
    date_from: from,
    date_to: to,
  });

  if (error) {
    throw new Error(`Failed to load truck summary: ${error.message}`);
  }

  return data ?? [];
}

export async function getTruckDockets(
  truckId: string,
  from: string,
  to: string
) {
  const supabase = await createClient();

  const { data: truck, error: truckError } = await supabase
    .from("trucks")
    .select("*")
    .eq("id", truckId)
    .single();

  if (truckError) {
    throw new Error(`Failed to load truck: ${truckError.message}`);
  }

  if (!truck.truck_number) {
    return { truck, dockets: [] };
  }

  const { data: dockets, error: docketsError } = await supabase
    .from("docket_summary")
    .select("*")
    .eq("truck_number", truck.truck_number)
    .gte("docket_date", from)
    .lte("docket_date", to)
    .order("docket_date", { ascending: false });

  if (docketsError) {
    throw new Error(`Failed to load truck dockets: ${docketsError.message}`);
  }

  return { truck, dockets: dockets ?? [] };
}

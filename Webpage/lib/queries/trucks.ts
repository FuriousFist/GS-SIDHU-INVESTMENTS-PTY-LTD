import { createClient } from "@/lib/supabase/server";
import { loadOwnerSlots } from "@/lib/queries/documents";

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

/**
 * Everything the truck page's details and documents sections need: the
 * companies (for the company select), the truck's trailer, and the
 * document checklists for the truck and its trailer.
 */
export async function getTruckCompliance(truck: {
  id: string;
  company: string | null;
  company_id: string | null;
}) {
  const supabase = await createClient();

  const { data: companies, error: companiesError } = await supabase
    .from("companies")
    .select("id, name, supplier")
    .order("name");

  if (companiesError) {
    throw new Error(`Failed to load companies: ${companiesError.message}`);
  }

  const { data: trailer, error: trailerError } = await supabase
    .from("trailers")
    .select("*")
    .eq("truck_id", truck.id)
    .maybeSingle();

  if (trailerError) {
    throw new Error(`Failed to load trailer: ${trailerError.message}`);
  }

  const company =
    (companies ?? []).find((c) => c.id === truck.company_id) ?? null;
  const supplier = company?.supplier ?? truck.company;

  const truckDocuments = await loadOwnerSlots(supabase, {
    scope: "truck",
    ownerId: truck.id,
    supplier,
  });

  const trailerDocuments = trailer
    ? await loadOwnerSlots(supabase, {
        scope: "trailer",
        ownerId: trailer.id,
        supplier,
      })
    : [];

  return {
    companies: companies ?? [],
    company,
    trailer,
    truckDocuments,
    trailerDocuments,
  };
}

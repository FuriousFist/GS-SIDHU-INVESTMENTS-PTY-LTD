import { createClient } from "@/lib/supabase/server";

export const DOCKETS_PAGE_SIZE = 25;

export type DocketFilters = {
  from: string;
  to: string;
  docketType?: string;
  search?: string;
  page: number;
};

export async function listDockets(filters: DocketFilters) {
  const supabase = await createClient();

  let query = supabase
    .from("docket_summary")
    .select("*", { count: "exact" })
    .gte("docket_date", filters.from)
    .lte("docket_date", filters.to)
    .order("docket_date", { ascending: false });

  if (filters.docketType) {
    query = query.eq("docket_type", filters.docketType);
  }

  if (filters.search) {
    const term = filters.search.replace(/[%,]/g, "");
    query = query.or(
      `docket_number.ilike.%${term}%,customer_name.ilike.%${term}%`
    );
  }

  const start = (filters.page - 1) * DOCKETS_PAGE_SIZE;
  const end = start + DOCKETS_PAGE_SIZE - 1;

  const { data, count, error } = await query.range(start, end);

  if (error) {
    throw new Error(`Failed to load dockets: ${error.message}`);
  }

  return { dockets: data ?? [], total: count ?? 0 };
}

export async function getDocketById(id: string) {
  const supabase = await createClient();

  const { data: docket, error: docketError } = await supabase
    .from("docket_summary")
    .select("*")
    .eq("id", id)
    .single();

  if (docketError) {
    throw new Error(`Failed to load docket: ${docketError.message}`);
  }

  const { data: loads, error: loadsError } = await supabase
    .from("docket_loads")
    .select("*")
    .eq("docket_id", id);

  if (loadsError) {
    throw new Error(`Failed to load docket loads: ${loadsError.message}`);
  }

  let pdfUrl: string | null = null;

  if (docket.pdf_path) {
    const { data: signed } = await supabase.storage
      .from("dockets")
      .createSignedUrl(docket.pdf_path, 60);

    pdfUrl = signed?.signedUrl ?? null;
  }

  return { docket, loads: loads ?? [], pdfUrl };
}

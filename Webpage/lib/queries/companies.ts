import { createClient } from "@/lib/supabase/server";
import {
  DOCUMENT_SELECT,
  getDocumentTypes,
  loadOwnerSlots,
  toSlotDocument,
  toVersionInfo,
} from "@/lib/queries/documents";
import {
  buildDocumentSlots,
  countStatuses,
  summariseSlots,
  versionStatus,
  type DocumentSlot,
  type SlotSummary,
  type StatusCounts,
} from "@/lib/utils/document-slots";
import type { Database } from "@/types/database.types";

export type CompanyRow = Database["public"]["Tables"]["companies"]["Row"];
export type TruckRow = Database["public"]["Tables"]["trucks"]["Row"];
export type TrailerRow = Database["public"]["Tables"]["trailers"]["Row"];

export type CompanySummary = CompanyRow & {
  truckCount: number;
  statusCounts: StatusCounts;
};

/** Companies with their truck count and document status counts. */
export async function getCompanies(): Promise<CompanySummary[]> {
  const supabase = await createClient();

  const { data: companies, error: companiesError } = await supabase
    .from("companies")
    .select("*")
    .order("name");

  if (companiesError) {
    throw new Error(`Failed to load companies: ${companiesError.message}`);
  }

  const { data: trucks, error: trucksError } = await supabase
    .from("trucks")
    .select("id, company_id");

  if (trucksError) {
    throw new Error(`Failed to load trucks: ${trucksError.message}`);
  }

  const { data: documents, error: documentsError } = await supabase
    .from("documents")
    .select(DOCUMENT_SELECT);

  if (documentsError) {
    throw new Error(`Failed to load documents: ${documentsError.message}`);
  }

  return (companies ?? []).map((company) => ({
    ...company,
    truckCount: (trucks ?? []).filter((t) => t.company_id === company.id)
      .length,
    statusCounts: countStatuses(
      (documents ?? [])
        .filter((d) => d.company_id === company.id)
        .map((d) => versionStatus(toVersionInfo(d.current_version)))
    ),
  }));
}

export type CompanyTruck = TruckRow & {
  trailer: TrailerRow | null;
  summary: SlotSummary;
};

export type CompanyDetail = {
  company: CompanyRow;
  documents: DocumentSlot[];
  trucks: CompanyTruck[];
};

/**
 * A company with its document checklist and its trucks, each truck
 * rolled up to the worst status across its own and its trailer's
 * documents plus the soonest expiring one.
 */
export async function getCompany(id: string): Promise<CompanyDetail> {
  const supabase = await createClient();

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("*")
    .eq("id", id)
    .single();

  if (companyError) {
    throw new Error(`Failed to load company: ${companyError.message}`);
  }

  const documents = await loadOwnerSlots(supabase, {
    scope: "company",
    ownerId: company.id,
    supplier: company.supplier,
  });

  const { data: trucks, error: trucksError } = await supabase
    .from("trucks")
    .select("*, trailer:trailers(*)")
    .eq("company_id", company.id)
    .order("truck_number");

  if (trucksError) {
    throw new Error(`Failed to load trucks: ${trucksError.message}`);
  }

  const truckRows = trucks ?? [];
  const truckIds = truckRows.map((t) => t.id);
  const trailerIds = truckRows
    .map((t) => t.trailer?.id)
    .filter((tid): tid is string => !!tid);

  const vehicleTypes =
    truckRows.length > 0
      ? await getDocumentTypes(
          supabase,
          ["truck", "trailer"],
          company.supplier
        )
      : [];
  const truckTypes = vehicleTypes.filter((t) => t.scope === "truck");
  const trailerTypes = vehicleTypes.filter((t) => t.scope === "trailer");

  const { data: truckDocuments, error: truckDocumentsError } =
    truckIds.length > 0
      ? await supabase
          .from("documents")
          .select(DOCUMENT_SELECT)
          .in("truck_id", truckIds)
      : { data: [], error: null };

  if (truckDocumentsError) {
    throw new Error(
      `Failed to load truck documents: ${truckDocumentsError.message}`
    );
  }

  const { data: trailerDocuments, error: trailerDocumentsError } =
    trailerIds.length > 0
      ? await supabase
          .from("documents")
          .select(DOCUMENT_SELECT)
          .in("trailer_id", trailerIds)
      : { data: [], error: null };

  if (trailerDocumentsError) {
    throw new Error(
      `Failed to load trailer documents: ${trailerDocumentsError.message}`
    );
  }

  return {
    company,
    documents,
    trucks: truckRows.map((truck) => {
      const slots = buildDocumentSlots(
        truckTypes,
        (truckDocuments ?? [])
          .filter((d) => d.truck_id === truck.id)
          .map((d) => toSlotDocument(d))
      );

      const trailerSlots = truck.trailer
        ? buildDocumentSlots(
            trailerTypes,
            (trailerDocuments ?? [])
              .filter((d) => d.trailer_id === truck.trailer!.id)
              .map((d) => toSlotDocument(d))
          )
        : [];

      return {
        ...truck,
        summary: summariseSlots([...slots, ...trailerSlots]),
      };
    }),
  };
}

import { createClient } from "@/lib/supabase/server";
import { getDocumentStatus } from "@/lib/utils/document-status";
import {
  buildDocumentSlots,
  type DocumentScope,
  type DocumentSlot,
  type DocumentTypeInfo,
  type DocumentVersionInfo,
  type SlotDocument,
} from "@/lib/utils/document-slots";
import type { Database } from "@/types/database.types";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;
type DocumentTypeRow = Database["public"]["Tables"]["document_types"]["Row"];
type DocumentVersionRow =
  Database["public"]["Tables"]["document_versions"]["Row"];

export const DOCUMENTS_BUCKET = "compliance-documents";
export const SIGNED_URL_TTL_SECONDS = 60;

/**
 * `documents` has two links to `document_versions` (current_version_id,
 * and versions.document_id back to documents), so the embed needs the
 * FK hint to pick the "current version" direction.
 */
export const DOCUMENT_SELECT =
  "id, document_type_id, company_id, truck_id, trailer_id, label, current_version:document_versions!documents_current_version_id_fkey(id, storage_path, file_name, mime_type, size_bytes, expiry_date, never_expires, uploaded_at)";

export type OwnerRef =
  | { companyId: string }
  | { truckId: string }
  | { trailerId: string };

export type ResolvedOwner = {
  scope: DocumentScope;
  ownerId: string;
  supplier: string | null;
};

export function toDocumentTypeInfo(row: DocumentTypeRow): DocumentTypeInfo {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    scope: row.scope as DocumentScope,
    category: row.category as DocumentTypeInfo["category"],
    supplier: row.supplier,
    required: row.required,
    defaultNeverExpires: row.default_never_expires,
    sortOrder: row.sort_order,
  };
}

type VersionEmbed = Pick<
  DocumentVersionRow,
  | "id"
  | "storage_path"
  | "file_name"
  | "mime_type"
  | "size_bytes"
  | "expiry_date"
  | "never_expires"
  | "uploaded_at"
>;

export function toVersionInfo(
  row: VersionEmbed | null | undefined
): DocumentVersionInfo | null {
  if (!row) return null;
  return {
    id: row.id,
    storagePath: row.storage_path,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    expiryDate: row.expiry_date,
    neverExpires: row.never_expires,
    uploadedAt: row.uploaded_at,
  };
}

/** Signs a batch of storage paths; paths that fail to sign map to null. */
export async function signStoragePaths(
  supabase: SupabaseClient,
  paths: string[]
) {
  const urls = new Map<string, string | null>();
  if (paths.length === 0) return urls;

  const { data } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);

  for (const entry of data ?? []) {
    if (entry.path) urls.set(entry.path, entry.signedUrl ?? null);
  }
  return urls;
}

/** Finds the scope and supplier the document checklist is drawn from. */
export async function resolveOwner(
  supabase: SupabaseClient,
  owner: OwnerRef
): Promise<ResolvedOwner> {
  if ("companyId" in owner) {
    const { data, error } = await supabase
      .from("companies")
      .select("id, supplier")
      .eq("id", owner.companyId)
      .single();

    if (error) throw new Error(`Failed to load company: ${error.message}`);
    return { scope: "company", ownerId: data.id, supplier: data.supplier };
  }

  if ("truckId" in owner) {
    const { data, error } = await supabase
      .from("trucks")
      .select("id, company, companies(supplier)")
      .eq("id", owner.truckId)
      .single();

    if (error) throw new Error(`Failed to load truck: ${error.message}`);
    return {
      scope: "truck",
      ownerId: data.id,
      supplier: data.companies?.supplier ?? data.company,
    };
  }

  const { data, error } = await supabase
    .from("trailers")
    .select("id, trucks(company, companies(supplier))")
    .eq("id", owner.trailerId)
    .single();

  if (error) throw new Error(`Failed to load trailer: ${error.message}`);
  return {
    scope: "trailer",
    ownerId: data.id,
    supplier: data.trucks?.companies?.supplier ?? data.trucks?.company ?? null,
  };
}

/** Every document type that applies to a scope for a supplier. */
export async function getDocumentTypes(
  supabase: SupabaseClient,
  scopes: DocumentScope[],
  supplier: string | null
) {
  let query = supabase
    .from("document_types")
    .select("*")
    .in("scope", scopes)
    .order("sort_order");

  query = supplier
    ? query.or(`supplier.eq.${supplier},supplier.is.null`)
    : query.or("supplier.is.null");

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load document types: ${error.message}`);

  return (data ?? []).map(toDocumentTypeInfo);
}

type DocumentEmbedRow = {
  id: string;
  document_type_id: string;
  company_id: string | null;
  truck_id: string | null;
  trailer_id: string | null;
  label: string | null;
  current_version: VersionEmbed | null;
};

export function toSlotDocument(
  row: DocumentEmbedRow,
  urls?: Map<string, string | null>
): SlotDocument {
  const currentVersion = toVersionInfo(row.current_version);
  return {
    id: row.id,
    document_type_id: row.document_type_id,
    label: row.label,
    currentVersion,
    fileUrl: currentVersion
      ? (urls?.get(currentVersion.storagePath) ?? null)
      : null,
  };
}

export async function loadOwnerSlots(
  supabase: SupabaseClient,
  owner: ResolvedOwner
): Promise<DocumentSlot[]> {
  const types = await getDocumentTypes(supabase, [owner.scope], owner.supplier);

  const ownerColumn = `${owner.scope}_id` as const;
  const { data, error } = await supabase
    .from("documents")
    .select(DOCUMENT_SELECT)
    .eq(ownerColumn, owner.ownerId);

  if (error) throw new Error(`Failed to load documents: ${error.message}`);

  const rows = (data ?? []) as DocumentEmbedRow[];
  const urls = await signStoragePaths(
    supabase,
    rows
      .map((row) => row.current_version?.storage_path)
      .filter((path): path is string => !!path)
  );

  return buildDocumentSlots(
    types,
    rows.map((row) => toSlotDocument(row, urls))
  );
}

/**
 * The full checklist for a company, truck or trailer: every applicable
 * document type, joined to its document (with current version, signed
 * URL and status) when one exists.
 */
export async function getDocumentsForOwner(owner: OwnerRef) {
  const supabase = await createClient();
  const resolved = await resolveOwner(supabase, owner);
  return loadOwnerSlots(supabase, resolved);
}

export type DocumentVersionWithUrl = DocumentVersionInfo & {
  url: string | null;
};

/** All versions of a document, newest first, each with a signed URL. */
export async function getDocumentVersions(
  documentId: string
): Promise<DocumentVersionWithUrl[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("document_versions")
    .select("*")
    .eq("document_id", documentId)
    .order("uploaded_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load document versions: ${error.message}`);
  }

  const rows = data ?? [];
  const urls = await signStoragePaths(
    supabase,
    rows.map((row) => row.storage_path)
  );

  return rows.map((row) => ({
    ...toVersionInfo(row)!,
    url: urls.get(row.storage_path) ?? null,
  }));
}

/** Expired + expiring documents across every company, truck and trailer. */
export async function getComplianceAlertCount() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("documents")
    .select(
      "id, current_version:document_versions!documents_current_version_id_fkey(expiry_date, never_expires)"
    );

  if (error) {
    throw new Error(`Failed to load compliance alerts: ${error.message}`);
  }

  let count = 0;
  for (const row of data ?? []) {
    const version = row.current_version;
    if (!version) continue;
    const status = getDocumentStatus({
      hasFile: true,
      expiryDate: version.expiry_date,
      neverExpires: version.never_expires,
    });
    if (status === "expired" || status === "expiring") count += 1;
  }
  return count;
}

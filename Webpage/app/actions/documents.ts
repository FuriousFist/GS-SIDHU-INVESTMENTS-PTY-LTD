"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { DOCUMENTS_BUCKET } from "@/lib/queries/documents";
import {
  MAX_UPLOAD_BYTES,
  REGISTRATION_STATES,
  TRUCK_TYPES,
  type RegistrationState,
  type TruckType,
} from "@/lib/utils/document-constants";

export type ActionResult = { ok: true } | { ok: false; error: string };

type Scope = "company" | "truck" | "trailer";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

function fail(error: string): ActionResult {
  return { ok: false, error };
}

async function requireUser(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value
    )
  );
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  return !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());
}

function optionalText(value: unknown, max = 500): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

/**
 * Expiry is either a date or an explicit "never expires"; both missing
 * (or both given) is rejected so a document can't silently lose its date.
 */
function parseExpiry(input: {
  expiryDate: unknown;
  neverExpires: unknown;
}): { expiryDate: string | null; neverExpires: boolean } | { error: string } {
  const neverExpires =
    input.neverExpires === true ||
    input.neverExpires === "on" ||
    input.neverExpires === "true";
  const rawDate = optionalText(input.expiryDate);

  if (neverExpires) return { expiryDate: null, neverExpires: true };
  if (!rawDate) return { error: "Enter an expiry date or tick Never expire." };
  if (!isIsoDate(rawDate)) return { error: "Expiry date must be YYYY-MM-DD." };
  return { expiryDate: rawDate, neverExpires: false };
}

function safeFileName(name: string) {
  const cleaned = name.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^_+/, "");
  return cleaned.slice(0, 120) || "document";
}

type OwnerPaths = { scope: Scope; ownerId: string; paths: string[] };

/** Which pages show this document, so they can be revalidated. */
async function ownerPaths(
  supabase: SupabaseClient,
  document: {
    company_id: string | null;
    truck_id: string | null;
    trailer_id: string | null;
  }
): Promise<OwnerPaths> {
  if (document.company_id) {
    return {
      scope: "company",
      ownerId: document.company_id,
      paths: ["/companies", `/companies/${document.company_id}`],
    };
  }

  if (document.truck_id) {
    return {
      scope: "truck",
      ownerId: document.truck_id,
      paths: ["/companies", `/trucks/${document.truck_id}`],
    };
  }

  const trailerId = document.trailer_id!;
  const { data: trailer } = await supabase
    .from("trailers")
    .select("truck_id")
    .eq("id", trailerId)
    .single();

  return {
    scope: "trailer",
    ownerId: trailerId,
    paths: [
      "/companies",
      ...(trailer?.truck_id ? [`/trucks/${trailer.truck_id}`] : []),
    ],
  };
}

function revalidate(paths: string[]) {
  for (const path of paths) revalidatePath(path);
}

/**
 * Uploads a new version of a document, creating the `documents` row on
 * first upload. Form fields: `documentId`, or `documentTypeId` plus one of
 * `companyId` / `truckId` / `trailerId` (and optional `label`); `file`;
 * `expiryDate` or `neverExpires=on`. Earlier versions are kept.
 */
export async function uploadDocumentVersion(
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  if (!user) return fail("You must be logged in.");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return fail("Choose a file to upload.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return fail("File must be 10 MB or smaller.");
  }

  const expiry = parseExpiry({
    expiryDate: formData.get("expiryDate"),
    neverExpires: formData.get("neverExpires"),
  });
  if ("error" in expiry) return fail(expiry.error);

  // Resolve (or lazily create) the document row.
  let document: {
    id: string;
    company_id: string | null;
    truck_id: string | null;
    trailer_id: string | null;
  };

  const documentId = formData.get("documentId");

  if (documentId) {
    if (!isUuid(documentId)) return fail("Invalid document.");

    const { data, error } = await supabase
      .from("documents")
      .select("id, company_id, truck_id, trailer_id")
      .eq("id", documentId)
      .single();

    if (error || !data) return fail("Document not found.");
    document = data;
  } else {
    const documentTypeId = formData.get("documentTypeId");
    const companyId = formData.get("companyId");
    const truckId = formData.get("truckId");
    const trailerId = formData.get("trailerId");
    const label = optionalText(formData.get("label"), 120);

    if (!isUuid(documentTypeId)) return fail("Choose a document type.");

    const owners = [companyId, truckId, trailerId].filter(Boolean);
    if (owners.length !== 1 || !isUuid(owners[0])) {
      return fail("A document must belong to exactly one company, truck or trailer.");
    }

    const insert = {
      document_type_id: documentTypeId,
      company_id: isUuid(companyId) ? companyId : null,
      truck_id: isUuid(truckId) ? truckId : null,
      trailer_id: isUuid(trailerId) ? trailerId : null,
      label,
    };

    // Reuse an existing slot for this type + owner (+ label) rather than
    // creating a duplicate when two uploads race on a fresh checklist.
    let existingQuery = supabase
      .from("documents")
      .select("id, company_id, truck_id, trailer_id")
      .eq("document_type_id", insert.document_type_id);
    if (insert.company_id) {
      existingQuery = existingQuery.eq("company_id", insert.company_id);
    } else if (insert.truck_id) {
      existingQuery = existingQuery.eq("truck_id", insert.truck_id);
    } else {
      existingQuery = existingQuery.eq("trailer_id", insert.trailer_id!);
    }
    existingQuery = label
      ? existingQuery.eq("label", label)
      : existingQuery.is("label", null);

    const { data: existing } = await existingQuery.limit(1);
    const match = existing?.[0];

    if (match) {
      document = match;
    } else {
      const { data: created, error: createError } = await supabase
        .from("documents")
        .insert(insert)
        .select("id, company_id, truck_id, trailer_id")
        .single();

      if (createError || !created) {
        return fail(`Could not create document: ${createError?.message}`);
      }
      document = created;
    }
  }

  const owner = await ownerPaths(supabase, document);
  const storagePath = `${owner.scope}/${owner.ownerId}/${document.id}/${Date.now()}-${safeFileName(file.name)}`;

  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, await file.arrayBuffer(), {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) return fail(`Upload failed: ${uploadError.message}`);

  const { data: version, error: versionError } = await supabase
    .from("document_versions")
    .insert({
      document_id: document.id,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type || "application/octet-stream",
      size_bytes: file.size,
      expiry_date: expiry.expiryDate,
      never_expires: expiry.neverExpires,
      uploaded_by: user.id,
    })
    .select("id")
    .single();

  if (versionError || !version) {
    return fail(`Could not record the new version: ${versionError?.message}`);
  }

  const { error: pointerError } = await supabase
    .from("documents")
    .update({ current_version_id: version.id })
    .eq("id", document.id);

  if (pointerError) {
    return fail(`Could not update the document: ${pointerError.message}`);
  }

  revalidate(owner.paths);
  return { ok: true };
}

/** Changes the expiry on the current version only; no new file. */
export async function updateDocumentExpiry(input: {
  documentId: string;
  expiryDate?: string | null;
  neverExpires?: boolean;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  if (!user) return fail("You must be logged in.");

  if (!isUuid(input.documentId)) return fail("Invalid document.");

  const expiry = parseExpiry({
    expiryDate: input.expiryDate,
    neverExpires: input.neverExpires,
  });
  if ("error" in expiry) return fail(expiry.error);

  const { data: document, error } = await supabase
    .from("documents")
    .select("id, company_id, truck_id, trailer_id, current_version_id")
    .eq("id", input.documentId)
    .single();

  if (error || !document) return fail("Document not found.");
  if (!document.current_version_id) {
    return fail("Upload a file before setting an expiry date.");
  }

  const { error: updateError } = await supabase
    .from("document_versions")
    .update({
      expiry_date: expiry.expiryDate,
      never_expires: expiry.neverExpires,
    })
    .eq("id", document.current_version_id);

  if (updateError) return fail(`Could not update expiry: ${updateError.message}`);

  const owner = await ownerPaths(supabase, document);
  revalidate(owner.paths);
  return { ok: true };
}

/** Adds an empty company document slot (e.g. Workcover for a second state). */
export async function createCompanyDocument(input: {
  companyId: string;
  documentTypeId: string;
  label?: string | null;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  if (!user) return fail("You must be logged in.");

  if (!isUuid(input.companyId)) return fail("Invalid company.");
  if (!isUuid(input.documentTypeId)) return fail("Choose a document type.");

  const { error } = await supabase.from("documents").insert({
    company_id: input.companyId,
    document_type_id: input.documentTypeId,
    label: optionalText(input.label, 120),
  });

  if (error) return fail(`Could not add document: ${error.message}`);

  revalidate(["/companies", `/companies/${input.companyId}`]);
  return { ok: true };
}

export async function updateCompany(input: {
  id: string;
  name: string;
  soleTrader: boolean;
  abn?: string | null;
  acn?: string | null;
  notes?: string | null;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  if (!user) return fail("You must be logged in.");

  if (!isUuid(input.id)) return fail("Invalid company.");
  const name = optionalText(input.name, 200);
  if (!name) return fail("Company name is required.");

  const { error } = await supabase
    .from("companies")
    .update({
      name,
      sole_trader: input.soleTrader === true,
      abn: optionalText(input.abn, 20),
      acn: optionalText(input.acn, 20),
      notes: optionalText(input.notes, 2000),
    })
    .eq("id", input.id);

  if (error) return fail(`Could not update company: ${error.message}`);

  revalidate(["/companies", `/companies/${input.id}`]);
  return { ok: true };
}

export async function updateTruckDetails(input: {
  truckId: string;
  companyId?: string | null;
  truckType?: string | null;
  registration?: string | null;
  registrationState?: string | null;
  baseLocation?: string | null;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  if (!user) return fail("You must be logged in.");

  if (!isUuid(input.truckId)) return fail("Invalid truck.");

  const truckType = optionalText(input.truckType);
  if (truckType && !TRUCK_TYPES.includes(truckType as TruckType)) {
    return fail("Type must be agitator or tipper.");
  }

  const registrationState = optionalText(input.registrationState);
  if (
    registrationState &&
    !REGISTRATION_STATES.includes(registrationState as RegistrationState)
  ) {
    return fail("Registration state must be an Australian state or territory.");
  }

  const companyId = optionalText(input.companyId);
  if (companyId && !isUuid(companyId)) return fail("Invalid company.");

  // Keep the legacy `trucks.company` text in step with the linked
  // company so get_truck_summary keeps reporting the right supplier.
  let company: string | null | undefined;
  if (companyId) {
    const { data, error } = await supabase
      .from("companies")
      .select("supplier")
      .eq("id", companyId)
      .single();
    if (error || !data) return fail("Company not found.");
    company = data.supplier;
  }

  const { error } = await supabase
    .from("trucks")
    .update({
      company_id: companyId,
      ...(company !== undefined ? { company } : {}),
      truck_type: truckType,
      registration: optionalText(input.registration, 20),
      registration_state: registrationState,
      base_location: optionalText(input.baseLocation, 200),
    })
    .eq("id", input.truckId);

  if (error) return fail(`Could not update truck: ${error.message}`);

  revalidate([
    "/trucks",
    `/trucks/${input.truckId}`,
    "/companies",
    ...(companyId ? [`/companies/${companyId}`] : []),
  ]);
  return { ok: true };
}

/** Creates or updates the truck's single trailer. Tippers only. */
export async function upsertTrailer(input: {
  truckId: string;
  registration?: string | null;
  registrationState?: string | null;
  notes?: string | null;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  if (!user) return fail("You must be logged in.");

  if (!isUuid(input.truckId)) return fail("Invalid truck.");

  const registrationState = optionalText(input.registrationState);
  if (
    registrationState &&
    !REGISTRATION_STATES.includes(registrationState as RegistrationState)
  ) {
    return fail("Registration state must be an Australian state or territory.");
  }

  const { data: truck, error: truckError } = await supabase
    .from("trucks")
    .select("id, truck_type, company_id")
    .eq("id", input.truckId)
    .single();

  if (truckError || !truck) return fail("Truck not found.");
  if (truck.truck_type !== "tipper") {
    return fail("Only tippers have a trailer.");
  }

  const { error } = await supabase.from("trailers").upsert(
    {
      truck_id: truck.id,
      registration: optionalText(input.registration, 20),
      registration_state: registrationState,
      notes: optionalText(input.notes, 2000),
    },
    { onConflict: "truck_id" }
  );

  if (error) return fail(`Could not save trailer: ${error.message}`);

  revalidate([
    `/trucks/${truck.id}`,
    "/companies",
    ...(truck.company_id ? [`/companies/${truck.company_id}`] : []),
  ]);
  return { ok: true };
}

import {
  getDocumentStatus,
  statusSortRank,
  worstStatus,
  type DocumentStatus,
} from "@/lib/utils/document-status";

export type DocumentScope = "company" | "truck" | "trailer";
export type DocumentCategory = "insurance" | "other";

export type DocumentTypeInfo = {
  id: string;
  code: string;
  name: string;
  scope: DocumentScope;
  category: DocumentCategory | null;
  supplier: string | null;
  required: boolean;
  defaultNeverExpires: boolean;
  sortOrder: number;
};

export type DocumentVersionInfo = {
  id: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number | null;
  expiryDate: string | null;
  neverExpires: boolean;
  uploadedAt: string;
};

/**
 * One row in a document checklist: an applicable document type joined to
 * the `documents` row holding it, if one exists yet. Truck and trailer
 * checklists show every type as a slot; company templates can repeat a
 * type with different labels (e.g. Workcover for QLD / VIC / SA).
 */
export type DocumentSlot = {
  documentId: string | null;
  documentType: DocumentTypeInfo;
  label: string | null;
  currentVersion: DocumentVersionInfo | null;
  /** Short-lived signed URL for the current file, when there is one. */
  fileUrl: string | null;
  status: DocumentStatus;
};

export type SlotDocument = {
  id: string;
  document_type_id: string;
  label: string | null;
  currentVersion: DocumentVersionInfo | null;
  fileUrl?: string | null;
};

export function versionStatus(
  version: DocumentVersionInfo | null,
  today?: Date
): DocumentStatus {
  return getDocumentStatus({
    hasFile: version !== null,
    neverExpires: version?.neverExpires ?? false,
    expiryDate: version?.expiryDate ?? null,
    today,
  });
}

/**
 * Joins document types to their documents: one slot per existing
 * document, plus an empty (missing) slot for every type with no
 * document yet. Sorted expired → expiring → missing → verified, then by
 * the type's sort order.
 */
export function buildDocumentSlots(
  types: DocumentTypeInfo[],
  documents: SlotDocument[],
  today?: Date
): DocumentSlot[] {
  const byType = new Map<string, SlotDocument[]>();
  for (const document of documents) {
    const list = byType.get(document.document_type_id) ?? [];
    list.push(document);
    byType.set(document.document_type_id, list);
  }

  const slots: DocumentSlot[] = [];

  for (const type of types) {
    const docs = byType.get(type.id);

    if (!docs || docs.length === 0) {
      slots.push({
        documentId: null,
        documentType: type,
        label: null,
        currentVersion: null,
        fileUrl: null,
        status: "missing",
      });
      continue;
    }

    for (const document of docs) {
      slots.push({
        documentId: document.id,
        documentType: type,
        label: document.label,
        currentVersion: document.currentVersion,
        fileUrl: document.fileUrl ?? null,
        status: versionStatus(document.currentVersion, today),
      });
    }
  }

  return sortDocumentSlots(slots);
}

export function sortDocumentSlots(slots: DocumentSlot[]) {
  return [...slots].sort(
    (a, b) =>
      statusSortRank(a.status) - statusSortRank(b.status) ||
      a.documentType.sortOrder - b.documentType.sortOrder ||
      (a.label ?? "").localeCompare(b.label ?? "")
  );
}

export type SlotSummary = {
  status: DocumentStatus;
  /** The soonest expiring (or already expired) document, for a notes column. */
  attention: { name: string; expiryDate: string; status: DocumentStatus } | null;
};

/**
 * Rolls a checklist up to one status. Empty slots only count as
 * "missing" when the type is required - otherwise a truck with every
 * optional Holcim inspection unfilled would never show as verified.
 */
export function summariseSlots(slots: DocumentSlot[]): SlotSummary {
  const counted = slots.filter(
    (slot) => slot.status !== "missing" || slot.documentType.required
  );

  const dated = slots
    .filter(
      (slot) =>
        (slot.status === "expired" || slot.status === "expiring") &&
        slot.currentVersion?.expiryDate
    )
    .sort((a, b) =>
      a.currentVersion!.expiryDate!.localeCompare(b.currentVersion!.expiryDate!)
    );

  const first = dated[0];

  return {
    status: worstStatus(counted.map((slot) => slot.status)),
    attention: first
      ? {
          name: first.documentType.name,
          expiryDate: first.currentVersion!.expiryDate!,
          status: first.status,
        }
      : null,
  };
}

export type StatusCounts = Record<DocumentStatus, number>;

export function countStatuses(statuses: DocumentStatus[]): StatusCounts {
  const counts: StatusCounts = {
    expired: 0,
    expiring: 0,
    missing: 0,
    verified: 0,
  };
  for (const status of statuses) counts[status] += 1;
  return counts;
}

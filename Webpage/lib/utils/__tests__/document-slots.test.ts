import { describe, expect, test } from "vitest";
import {
  buildDocumentSlots,
  countStatuses,
  summariseSlots,
  type DocumentTypeInfo,
  type DocumentVersionInfo,
} from "@/lib/utils/document-slots";

const TODAY = new Date("2026-09-15T12:00:00Z");

function type(
  id: string,
  overrides: Partial<DocumentTypeInfo> = {}
): DocumentTypeInfo {
  return {
    id,
    code: id,
    name: `Type ${id}`,
    scope: "truck",
    category: null,
    supplier: "Holcim",
    required: false,
    defaultNeverExpires: false,
    sortOrder: 0,
    ...overrides,
  };
}

function version(
  expiryDate: string | null,
  neverExpires = false
): DocumentVersionInfo {
  return {
    id: `v-${expiryDate}`,
    storagePath: "truck/x/y/file.pdf",
    fileName: "file.pdf",
    mimeType: "application/pdf",
    sizeBytes: 10,
    expiryDate,
    neverExpires,
    uploadedAt: "2026-09-01T00:00:00Z",
  };
}

describe("buildDocumentSlots", () => {
  test("includes every type as a missing slot when it has no document", () => {
    const slots = buildDocumentSlots(
      [type("rego", { sortOrder: 1 }), type("photos", { sortOrder: 2 })],
      [],
      TODAY
    );

    expect(slots.map((s) => [s.documentType.id, s.status, s.documentId])).toEqual(
      [
        ["rego", "missing", null],
        ["photos", "missing", null],
      ]
    );
  });

  test("sorts expired, expiring, missing, verified then by sort order", () => {
    const slots = buildDocumentSlots(
      [
        type("a", { sortOrder: 1 }),
        type("b", { sortOrder: 2 }),
        type("c", { sortOrder: 3 }),
        type("d", { sortOrder: 4 }),
        type("e", { sortOrder: 5 }),
      ],
      [
        { id: "da", document_type_id: "a", label: null, currentVersion: version("2030-01-01") },
        { id: "db", document_type_id: "b", label: null, currentVersion: version("2026-09-01") },
        { id: "dd", document_type_id: "d", label: null, currentVersion: version("2026-09-20") },
        { id: "de", document_type_id: "e", label: null, currentVersion: version(null, true) },
      ],
      TODAY
    );

    expect(slots.map((s) => `${s.documentType.id}:${s.status}`)).toEqual([
      "b:expired",
      "d:expiring",
      "c:missing",
      "a:verified",
      "e:verified",
    ]);
  });

  test("a company type with several labelled documents yields one slot each", () => {
    const slots = buildDocumentSlots(
      [type("workcover", { scope: "company", category: "insurance" })],
      [
        { id: "qld", document_type_id: "workcover", label: "QLD", currentVersion: version("2030-01-01") },
        { id: "vic", document_type_id: "workcover", label: "VIC", currentVersion: null },
      ],
      TODAY
    );

    expect(slots.map((s) => [s.label, s.status])).toEqual([
      ["VIC", "missing"],
      ["QLD", "verified"],
    ]);
  });
});

describe("summariseSlots", () => {
  test("worst status ignores missing optional types", () => {
    const summary = summariseSlots(
      buildDocumentSlots(
        [type("rego", { required: true }), type("photos")],
        [{ id: "d1", document_type_id: "rego", label: null, currentVersion: version("2030-01-01") }],
        TODAY
      )
    );

    expect(summary.status).toBe("verified");
    expect(summary.attention).toBeNull();
  });

  test("a missing required type makes the owner missing", () => {
    const summary = summariseSlots(
      buildDocumentSlots([type("rego", { required: true })], [], TODAY)
    );
    expect(summary.status).toBe("missing");
  });

  test("reports the soonest expiring document for the notes column", () => {
    const summary = summariseSlots(
      buildDocumentSlots(
        [type("a", { name: "Insurance" }), type("b", { name: "Rego" })],
        [
          { id: "d1", document_type_id: "a", label: null, currentVersion: version("2026-10-01") },
          { id: "d2", document_type_id: "b", label: null, currentVersion: version("2026-09-01") },
        ],
        TODAY
      )
    );

    expect(summary.status).toBe("expired");
    expect(summary.attention).toEqual({
      name: "Rego",
      expiryDate: "2026-09-01",
      status: "expired",
    });
  });
});

describe("countStatuses", () => {
  test("tallies each status", () => {
    expect(countStatuses(["expired", "verified", "verified", "missing"])).toEqual(
      { expired: 1, expiring: 0, missing: 1, verified: 2 }
    );
  });
});

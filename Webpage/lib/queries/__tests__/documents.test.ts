import { beforeEach, describe, expect, test, vi } from "vitest";
import { makeQueryBuilder, makeSupabaseMock } from "@/test/supabase-mock";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import {
  getComplianceAlertCount,
  getDocumentVersions,
  getDocumentsForOwner,
} from "@/lib/queries/documents";

const FUTURE = "2999-01-01";
const PAST = "2000-01-01";

function typeRow(id: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    code: id,
    name: `Type ${id}`,
    scope: "truck",
    category: null,
    supplier: "Holcim",
    required: false,
    default_never_expires: false,
    sort_order: 0,
    ...extra,
  };
}

function versionRow(expiry: string | null, neverExpires = false) {
  return {
    id: `v-${expiry ?? "never"}`,
    storage_path: `truck/t1/d/${expiry ?? "never"}.pdf`,
    file_name: "file.pdf",
    mime_type: "application/pdf",
    size_bytes: 1,
    expiry_date: expiry,
    never_expires: neverExpires,
    uploaded_at: "2026-09-01T00:00:00Z",
  };
}

describe("getDocumentsForOwner", () => {
  let supabase: ReturnType<typeof makeSupabaseMock>;
  let createSignedUrls: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    supabase = makeSupabaseMock();
    createSignedUrls = vi.fn().mockResolvedValue({ data: [], error: null });
    supabase.storage.from.mockReturnValue({ createSignedUrls });
    vi.mocked(createClient).mockResolvedValue(supabase as never);
  });

  test("returns a slot for every applicable type, including ones with no document", async () => {
    supabase.from
      // resolveOwner: truck with its company
      .mockReturnValueOnce(
        makeQueryBuilder({
          data: { id: "t1", company: "Holcim", companies: { supplier: "Holcim" } },
          error: null,
        })
      )
      // document_types
      .mockReturnValueOnce(
        makeQueryBuilder({
          data: [
            typeRow("rego", { required: true, sort_order: 1 }),
            typeRow("photos", { sort_order: 2 }),
          ],
          error: null,
        })
      )
      // documents (only rego has one)
      .mockReturnValueOnce(
        makeQueryBuilder({
          data: [
            {
              id: "d1",
              document_type_id: "rego",
              company_id: null,
              truck_id: "t1",
              trailer_id: null,
              label: null,
              current_version: versionRow(FUTURE),
            },
          ],
          error: null,
        })
      );
    createSignedUrls.mockResolvedValue({
      data: [{ path: `truck/t1/d/${FUTURE}.pdf`, signedUrl: "https://signed/rego" }],
      error: null,
    });

    const slots = await getDocumentsForOwner({ truckId: "t1" });

    expect(slots.map((s) => [s.documentType.id, s.status, s.documentId])).toEqual([
      ["photos", "missing", null],
      ["rego", "verified", "d1"],
    ]);
    expect(slots[1].fileUrl).toBe("https://signed/rego");
    expect(createSignedUrls).toHaveBeenCalledWith([`truck/t1/d/${FUTURE}.pdf`], 60);
    expect(supabase.from).toHaveBeenNthCalledWith(1, "trucks");
    expect(supabase.from).toHaveBeenNthCalledWith(2, "document_types");
    expect(supabase.from).toHaveBeenNthCalledWith(3, "documents");
  });

  test("falls back to the legacy trucks.company text when no company is linked", async () => {
    supabase.from
      .mockReturnValueOnce(
        makeQueryBuilder({
          data: { id: "t1", company: "Barro", companies: null },
          error: null,
        })
      )
      .mockReturnValueOnce(makeQueryBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeQueryBuilder({ data: [], error: null }));

    await getDocumentsForOwner({ truckId: "t1" });

    const typesBuilder = supabase.from.mock.results[1].value;
    expect(typesBuilder.or).toHaveBeenCalledWith("supplier.eq.Barro,supplier.is.null");
    expect(typesBuilder.in).toHaveBeenCalledWith("scope", ["truck"]);
  });

  test("company owners query by company_id and skip signing when nothing is uploaded", async () => {
    supabase.from
      .mockReturnValueOnce(
        makeQueryBuilder({ data: { id: "c1", supplier: "Holcim" }, error: null })
      )
      .mockReturnValueOnce(
        makeQueryBuilder({
          data: [typeRow("pli", { scope: "company", category: "insurance" })],
          error: null,
        })
      )
      .mockReturnValueOnce(makeQueryBuilder({ data: [], error: null }));

    const slots = await getDocumentsForOwner({ companyId: "c1" });

    expect(slots).toHaveLength(1);
    expect(slots[0].status).toBe("missing");
    const documentsBuilder = supabase.from.mock.results[2].value;
    expect(documentsBuilder.eq).toHaveBeenCalledWith("company_id", "c1");
    expect(createSignedUrls).not.toHaveBeenCalled();
  });

  test("throws when the owner can't be loaded", async () => {
    supabase.from.mockReturnValueOnce(
      makeQueryBuilder({ error: { message: "not found" } })
    );

    await expect(getDocumentsForOwner({ trailerId: "x" })).rejects.toThrow(
      "Failed to load trailer: not found"
    );
  });
});

describe("getDocumentVersions", () => {
  test("returns versions newest first with signed URLs", async () => {
    const supabase = makeSupabaseMock();
    const createSignedUrls = vi.fn().mockResolvedValue({
      data: [
        { path: "truck/t1/d/new.pdf", signedUrl: "https://signed/new" },
        { path: "truck/t1/d/old.pdf", signedUrl: null, error: "gone" },
      ],
      error: null,
    });
    supabase.storage.from.mockReturnValue({ createSignedUrls });
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    supabase.from.mockReturnValueOnce(
      makeQueryBuilder({
        data: [
          { ...versionRow(FUTURE), id: "new", storage_path: "truck/t1/d/new.pdf" },
          { ...versionRow(PAST), id: "old", storage_path: "truck/t1/d/old.pdf" },
        ],
        error: null,
      })
    );

    const versions = await getDocumentVersions("d1");

    expect(versions.map((v) => [v.id, v.url])).toEqual([
      ["new", "https://signed/new"],
      ["old", null],
    ]);
    const builder = supabase.from.mock.results[0].value;
    expect(builder.eq).toHaveBeenCalledWith("document_id", "d1");
    expect(builder.order).toHaveBeenCalledWith("uploaded_at", { ascending: false });
  });
});

describe("getComplianceAlertCount", () => {
  test("counts expired and expiring current versions only", async () => {
    const supabase = makeSupabaseMock();
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    supabase.from.mockReturnValueOnce(
      makeQueryBuilder({
        data: [
          { id: "a", current_version: { expiry_date: PAST, never_expires: false } },
          { id: "b", current_version: { expiry_date: FUTURE, never_expires: false } },
          { id: "c", current_version: { expiry_date: PAST, never_expires: true } },
          { id: "d", current_version: null },
          { id: "e", current_version: { expiry_date: PAST, never_expires: false } },
        ],
        error: null,
      })
    );

    expect(await getComplianceAlertCount()).toBe(2);
  });

  test("throws with the underlying message on error", async () => {
    const supabase = makeSupabaseMock();
    vi.mocked(createClient).mockResolvedValue(supabase as never);
    supabase.from.mockReturnValueOnce(
      makeQueryBuilder({ error: { message: "relation missing" } })
    );

    await expect(getComplianceAlertCount()).rejects.toThrow(
      "Failed to load compliance alerts: relation missing"
    );
  });
});

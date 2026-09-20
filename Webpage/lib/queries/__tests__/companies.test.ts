import { beforeEach, describe, expect, test, vi } from "vitest";
import { makeQueryBuilder, makeSupabaseMock } from "@/test/supabase-mock";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { getCompanies, getCompany } from "@/lib/queries/companies";

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

function docRow(
  id: string,
  owner: { company_id?: string; truck_id?: string; trailer_id?: string },
  typeId: string,
  expiry: string | null
) {
  return {
    id,
    document_type_id: typeId,
    company_id: null,
    truck_id: null,
    trailer_id: null,
    label: null,
    ...owner,
    current_version:
      expiry === null
        ? null
        : {
            id: `v-${id}`,
            storage_path: `p/${id}.pdf`,
            file_name: `${id}.pdf`,
            mime_type: "application/pdf",
            size_bytes: 1,
            expiry_date: expiry,
            never_expires: false,
            uploaded_at: "2026-09-01T00:00:00Z",
          },
  };
}

describe("getCompanies", () => {
  let supabase: ReturnType<typeof makeSupabaseMock>;

  beforeEach(() => {
    supabase = makeSupabaseMock();
    vi.mocked(createClient).mockResolvedValue(supabase as never);
  });

  test("adds truck and status counts per company", async () => {
    supabase.from
      .mockReturnValueOnce(
        makeQueryBuilder({
          data: [
            { id: "c1", name: "Holcim contract", supplier: "Holcim" },
            { id: "c2", name: "Barro contract", supplier: "Barro" },
          ],
          error: null,
        })
      )
      .mockReturnValueOnce(
        makeQueryBuilder({
          data: [
            { id: "t1", company_id: "c1" },
            { id: "t2", company_id: "c1" },
            { id: "t3", company_id: null },
          ],
          error: null,
        })
      )
      .mockReturnValueOnce(
        makeQueryBuilder({
          data: [
            docRow("d1", { company_id: "c1" }, "pli", PAST),
            docRow("d2", { company_id: "c1" }, "wc", FUTURE),
            docRow("d3", { company_id: "c1" }, "wc", null),
            docRow("d4", { truck_id: "t1" }, "rego", PAST),
          ],
          error: null,
        })
      );

    const companies = await getCompanies();

    expect(companies.map((c) => [c.id, c.truckCount, c.statusCounts])).toEqual([
      ["c1", 2, { expired: 1, expiring: 0, missing: 1, verified: 1 }],
      ["c2", 0, { expired: 0, expiring: 0, missing: 0, verified: 0 }],
    ]);
  });

  test("throws with the underlying message on error", async () => {
    supabase.from.mockReturnValueOnce(
      makeQueryBuilder({ error: { message: "boom" } })
    );

    await expect(getCompanies()).rejects.toThrow("Failed to load companies: boom");
  });
});

describe("getCompany", () => {
  let supabase: ReturnType<typeof makeSupabaseMock>;

  beforeEach(() => {
    supabase = makeSupabaseMock();
    supabase.storage.from.mockReturnValue({
      createSignedUrls: vi.fn().mockResolvedValue({ data: [], error: null }),
    });
    vi.mocked(createClient).mockResolvedValue(supabase as never);
  });

  test("rolls each truck up to the worst status across truck and trailer docs", async () => {
    supabase.from
      // company
      .mockReturnValueOnce(
        makeQueryBuilder({
          data: { id: "c1", name: "Holcim contract", supplier: "Holcim" },
          error: null,
        })
      )
      // company document types
      .mockReturnValueOnce(
        makeQueryBuilder({
          data: [typeRow("pli", { scope: "company", category: "insurance" })],
          error: null,
        })
      )
      // company documents
      .mockReturnValueOnce(makeQueryBuilder({ data: [], error: null }))
      // trucks with trailers
      .mockReturnValueOnce(
        makeQueryBuilder({
          data: [
            { id: "t1", truck_number: "101", truck_type: "agitator", trailer: null },
            {
              id: "t2",
              truck_number: "202",
              truck_type: "tipper",
              trailer: { id: "tr2", truck_id: "t2", registration: "TRL" },
            },
          ],
          error: null,
        })
      )
      // truck + trailer document types
      .mockReturnValueOnce(
        makeQueryBuilder({
          data: [
            typeRow("truck_rego", { scope: "truck", required: true, name: "Registration" }),
            typeRow("truck_photos", { scope: "truck", name: "Photos" }),
            typeRow("trailer_rego", { scope: "trailer", required: true, name: "Trailer rego" }),
          ],
          error: null,
        })
      )
      // truck documents
      .mockReturnValueOnce(
        makeQueryBuilder({
          data: [
            docRow("d1", { truck_id: "t1" }, "truck_rego", FUTURE),
            docRow("d2", { truck_id: "t2" }, "truck_rego", FUTURE),
          ],
          error: null,
        })
      )
      // trailer documents
      .mockReturnValueOnce(
        makeQueryBuilder({
          data: [docRow("d3", { trailer_id: "tr2" }, "trailer_rego", PAST)],
          error: null,
        })
      );

    const result = await getCompany("c1");

    expect(result.company.id).toBe("c1");
    expect(result.documents.map((s) => [s.documentType.id, s.status])).toEqual([
      ["pli", "missing"],
    ]);

    const [t1, t2] = result.trucks;
    // Optional Photos missing doesn't drag a verified truck down.
    expect(t1.summary).toEqual({ status: "verified", attention: null });
    // The trailer's expired rego makes the tipper expired.
    expect(t2.summary.status).toBe("expired");
    expect(t2.summary.attention).toEqual({
      name: "Trailer rego",
      expiryDate: PAST,
      status: "expired",
    });

    expect(supabase.from.mock.results[5].value.in).toHaveBeenCalledWith("truck_id", ["t1", "t2"]);
    expect(supabase.from.mock.results[6].value.in).toHaveBeenCalledWith("trailer_id", ["tr2"]);
  });

  test("company with no trucks skips the vehicle document queries", async () => {
    supabase.from
      .mockReturnValueOnce(
        makeQueryBuilder({
          data: { id: "c1", name: "Barro contract", supplier: "Barro" },
          error: null,
        })
      )
      .mockReturnValueOnce(makeQueryBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeQueryBuilder({ data: [], error: null }))
      .mockReturnValueOnce(makeQueryBuilder({ data: [], error: null }));

    const result = await getCompany("c1");

    expect(result.trucks).toEqual([]);
    expect(supabase.from).toHaveBeenCalledTimes(4);
  });

  test("throws when the company lookup errors", async () => {
    supabase.from.mockReturnValueOnce(
      makeQueryBuilder({ error: { message: "not found" } })
    );

    await expect(getCompany("missing")).rejects.toThrow(
      "Failed to load company: not found"
    );
  });
});

import { beforeEach, describe, expect, test, vi } from "vitest";
import { makeQueryBuilder, makeSupabaseMock } from "@/test/supabase-mock";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { DOCKETS_PAGE_SIZE, getDocketById, listDockets } from "@/lib/queries/dockets";

describe("listDockets", () => {
  let supabase: ReturnType<typeof makeSupabaseMock>;

  beforeEach(() => {
    supabase = makeSupabaseMock();
    vi.mocked(createClient).mockResolvedValue(supabase as never);
  });

  test("returns dockets and total count", async () => {
    supabase.from.mockReturnValue(
      makeQueryBuilder({ data: [{ id: "1" }, { id: "2" }], count: 2, error: null })
    );

    const result = await listDockets({
      from: "2026-08-01",
      to: "2026-08-31",
      page: 1,
    });

    expect(result).toEqual({ dockets: [{ id: "1" }, { id: "2" }], total: 2 });
    expect(supabase.from).toHaveBeenCalledWith("docket_summary");
  });

  test("missing data/count default to empty list and zero", async () => {
    supabase.from.mockReturnValue(
      makeQueryBuilder({ data: null, count: null, error: null })
    );

    const result = await listDockets({
      from: "2026-08-01",
      to: "2026-08-31",
      page: 1,
    });

    expect(result).toEqual({ dockets: [], total: 0 });
  });

  test("throws with the underlying message on error", async () => {
    supabase.from.mockReturnValue(
      makeQueryBuilder({ error: { message: "connection reset" } })
    );

    await expect(
      listDockets({ from: "2026-08-01", to: "2026-08-31", page: 1 })
    ).rejects.toThrow("Failed to load dockets: connection reset");
  });

  test("search term strips % and , to avoid breaking the ilike pattern", async () => {
    const builder = makeQueryBuilder({ data: [], count: 0, error: null });
    supabase.from.mockReturnValue(builder);

    await listDockets({
      from: "2026-08-01",
      to: "2026-08-31",
      page: 1,
      search: "100%,200",
    });

    expect(builder.or).toHaveBeenCalledWith(
      "docket_number.ilike.%100200%,customer_name.ilike.%100200%"
    );
  });

  test("page number controls the requested range", async () => {
    const builder = makeQueryBuilder({ data: [], count: 0, error: null });
    supabase.from.mockReturnValue(builder);

    await listDockets({ from: "2026-08-01", to: "2026-08-31", page: 3 });

    const expectedStart = (3 - 1) * DOCKETS_PAGE_SIZE;
    expect(builder.range).toHaveBeenCalledWith(
      expectedStart,
      expectedStart + DOCKETS_PAGE_SIZE - 1
    );
  });
});

describe("getDocketById", () => {
  let supabase: ReturnType<typeof makeSupabaseMock>;

  beforeEach(() => {
    supabase = makeSupabaseMock();
    vi.mocked(createClient).mockResolvedValue(supabase as never);
  });

  test("returns docket, loads, and a signed PDF url when pdf_path is set", async () => {
    supabase.from
      .mockReturnValueOnce(
        makeQueryBuilder({
          data: { id: "1", pdf_path: "concrete/123/original.pdf" },
          error: null,
        })
      )
      .mockReturnValueOnce(
        makeQueryBuilder({ data: [{ id: "load-1" }], error: null })
      );

    supabase.storage.from.mockReturnValue({
      createSignedUrl: vi.fn().mockResolvedValue({
        data: { signedUrl: "https://signed.example/original.pdf" },
        error: null,
      }),
    });

    const result = await getDocketById("1");

    expect(result.docket).toEqual({
      id: "1",
      pdf_path: "concrete/123/original.pdf",
    });
    expect(result.loads).toEqual([{ id: "load-1" }]);
    expect(result.pdfUrl).toBe("https://signed.example/original.pdf");
  });

  test("no pdf_path means no signed url is requested", async () => {
    supabase.from
      .mockReturnValueOnce(
        makeQueryBuilder({ data: { id: "1", pdf_path: null }, error: null })
      )
      .mockReturnValueOnce(makeQueryBuilder({ data: [], error: null }));

    const result = await getDocketById("1");

    expect(result.pdfUrl).toBeNull();
    expect(supabase.storage.from).not.toHaveBeenCalled();
  });

  test("throws when the docket lookup errors", async () => {
    supabase.from.mockReturnValueOnce(
      makeQueryBuilder({ error: { message: "not found" } })
    );

    await expect(getDocketById("missing")).rejects.toThrow(
      "Failed to load docket: not found"
    );
  });

  test("throws when the loads lookup errors", async () => {
    supabase.from
      .mockReturnValueOnce(
        makeQueryBuilder({ data: { id: "1", pdf_path: null }, error: null })
      )
      .mockReturnValueOnce(
        makeQueryBuilder({ error: { message: "loads unavailable" } })
      );

    await expect(getDocketById("1")).rejects.toThrow(
      "Failed to load docket loads: loads unavailable"
    );
  });
});

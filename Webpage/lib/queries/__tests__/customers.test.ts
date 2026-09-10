import { beforeEach, describe, expect, test, vi } from "vitest";
import { makeQueryBuilder, makeSupabaseMock } from "@/test/supabase-mock";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { getCustomerSummary } from "@/lib/queries/customers";

describe("getCustomerSummary", () => {
  let supabase: ReturnType<typeof makeSupabaseMock>;

  beforeEach(() => {
    supabase = makeSupabaseMock();
    vi.mocked(createClient).mockResolvedValue(supabase as never);
  });

  test("returns rpc data, defaulting null to an empty array", async () => {
    supabase.rpc.mockReturnValue(
      makeQueryBuilder({ data: [{ customer_name: "Acme" }], error: null })
    );

    expect(await getCustomerSummary("2026-08-01", "2026-08-31")).toEqual([
      { customer_name: "Acme" },
    ]);
    expect(supabase.rpc).toHaveBeenCalledWith("get_customer_summary", {
      date_from: "2026-08-01",
      date_to: "2026-08-31",
    });
  });

  test("throws with the underlying message on error", async () => {
    supabase.rpc.mockReturnValue(
      makeQueryBuilder({ error: { message: "rpc failed" } })
    );

    await expect(
      getCustomerSummary("2026-08-01", "2026-08-31")
    ).rejects.toThrow("Failed to load customer summary: rpc failed");
  });
});

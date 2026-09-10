import { beforeEach, describe, expect, test, vi } from "vitest";
import { makeQueryBuilder, makeSupabaseMock } from "@/test/supabase-mock";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { getDriverSummary } from "@/lib/queries/drivers";

describe("getDriverSummary", () => {
  let supabase: ReturnType<typeof makeSupabaseMock>;

  beforeEach(() => {
    supabase = makeSupabaseMock();
    vi.mocked(createClient).mockResolvedValue(supabase as never);
  });

  test("groups by driver, sums quantities by docket type, sorts by docket count desc", async () => {
    supabase.from.mockReturnValue(
      makeQueryBuilder({
        data: [
          { driver_name: "Alice", docket_type: "concrete", total_m3: 7, total_tonnes: null },
          { driver_name: "Alice", docket_type: "concrete", total_m3: 5, total_tonnes: null },
          { driver_name: "Bob", docket_type: "aggregates", total_m3: null, total_tonnes: 30 },
          { driver_name: null, docket_type: "aggregates", total_m3: null, total_tonnes: 10 },
        ],
        error: null,
      })
    );

    const result = await getDriverSummary("2026-08-01", "2026-08-31");

    expect(result).toEqual([
      {
        driverName: "Alice",
        docketCount: 2,
        totalM3: 12,
        totalTonnes: 0,
      },
      {
        driverName: "Bob",
        docketCount: 1,
        totalM3: 0,
        totalTonnes: 30,
      },
      {
        driverName: "Unknown / not captured",
        docketCount: 1,
        totalM3: 0,
        totalTonnes: 10,
      },
    ]);
  });

  test("no dockets returns an empty list", async () => {
    supabase.from.mockReturnValue(makeQueryBuilder({ data: [], error: null }));

    expect(await getDriverSummary("2026-08-01", "2026-08-31")).toEqual([]);
  });

  test("throws with the underlying message on error", async () => {
    supabase.from.mockReturnValue(
      makeQueryBuilder({ error: { message: "timeout" } })
    );

    await expect(
      getDriverSummary("2026-08-01", "2026-08-31")
    ).rejects.toThrow("Failed to load driver summary: timeout");
  });
});

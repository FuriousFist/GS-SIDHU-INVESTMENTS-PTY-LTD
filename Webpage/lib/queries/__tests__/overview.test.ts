import { beforeEach, describe, expect, test, vi } from "vitest";
import { makeQueryBuilder, makeSupabaseMock } from "@/test/supabase-mock";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { getOverviewData } from "@/lib/queries/overview";

describe("getOverviewData", () => {
  let supabase: ReturnType<typeof makeSupabaseMock>;

  beforeEach(() => {
    supabase = makeSupabaseMock();
    vi.mocked(createClient).mockResolvedValue(supabase as never);
  });

  test("aggregates totals by docket type and counts distinct trucks", async () => {
    supabase.from.mockReturnValueOnce(
      makeQueryBuilder({
        data: [
          { docket_type: "concrete", total_m3: 7, total_tonnes: null, truck_number: "101", total_time_on_site: "00:40:00" },
          { docket_type: "concrete", total_m3: 5, total_tonnes: null, truck_number: "101", total_time_on_site: "01:00:00" },
          { docket_type: "aggregates", total_m3: null, total_tonnes: 30, truck_number: "202" },
          { docket_type: "aggregates", total_m3: null, total_tonnes: null, truck_number: null },
        ],
        error: null,
      })
    );
    supabase.from.mockReturnValueOnce(
      makeQueryBuilder({ data: [{ id: "recent-1" }], error: null })
    );
    const result = await getOverviewData("2026-08-01", "2026-08-31");

    expect(result.totalDockets).toBe(4);
    expect(result.totalConcreteM3).toBe(12);
    expect(result.totalAggregatesTonnes).toBe(30);
    // Distinct, non-null truck numbers only: "101" and "202".
    expect(result.activeTrucks).toBe(2);
    expect(result.recentDockets).toEqual([{ id: "recent-1" }]);
    // Only the two dockets with a time on site count towards the average.
    expect(result.siteStats).toEqual({ count: 2, avg: 50 });
  });

  test("empty data set returns zeroed totals, not an error", async () => {
    supabase.from.mockReturnValueOnce(makeQueryBuilder({ data: [], error: null }));
    supabase.from.mockReturnValueOnce(makeQueryBuilder({ data: [], error: null }));
    const result = await getOverviewData("2026-08-01", "2026-08-31");

    expect(result).toMatchObject({
      totalDockets: 0,
      totalConcreteM3: 0,
      totalAggregatesTonnes: 0,
      activeTrucks: 0,
      recentDockets: [],
    });
  });

  test("throws when the dockets query errors", async () => {
    supabase.from.mockReturnValueOnce(
      makeQueryBuilder({ error: { message: "db down" } })
    );

    await expect(getOverviewData("2026-08-01", "2026-08-31")).rejects.toThrow(
      "Failed to load overview data: db down"
    );
  });
});

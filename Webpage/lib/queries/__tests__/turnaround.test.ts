import { beforeEach, describe, expect, test, vi } from "vitest";
import { makeQueryBuilder, makeSupabaseMock } from "@/test/supabase-mock";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { getTurnaroundData } from "@/lib/queries/turnaround";

describe("getTurnaroundData", () => {
  let supabase: ReturnType<typeof makeSupabaseMock>;

  beforeEach(() => {
    supabase = makeSupabaseMock();
    vi.mocked(createClient).mockResolvedValue(supabase as never);
  });

  test("computes average and median site/wait times, skipping nulls", async () => {
    supabase.from.mockReturnValue(
      makeQueryBuilder({
        data: [
          {
            id: "1",
            docket_number: "A1",
            docket_type: "concrete",
            docket_date: "2026-08-01",
            truck_number: "101",
            total_time_on_site: "00:10:00",
            waiting_time: "00:05:00",
          },
          {
            id: "2",
            docket_number: "A2",
            docket_type: "concrete",
            docket_date: "2026-08-01",
            truck_number: "102",
            total_time_on_site: "00:20:00",
            waiting_time: null,
          },
          {
            id: "3",
            docket_number: "A3",
            docket_type: "concrete",
            docket_date: "2026-08-01",
            truck_number: "103",
            total_time_on_site: "00:30:00",
            waiting_time: "00:15:00",
          },
        ],
        error: null,
      })
    );

    const result = await getTurnaroundData("2026-08-01", "2026-08-31");

    expect(result.totalDockets).toBe(3);
    expect(result.siteStats).toEqual({ count: 3, avg: 20, median: 20 });
    // Only two non-null wait times: 5 and 15.
    expect(result.waitStats).toEqual({ count: 2, avg: 10, median: 10 });
    expect(result.dockets[0]).toMatchObject({
      id: "1",
      siteMinutes: 10,
      waitMinutes: 5,
    });
  });

  test("rows with a null id are filtered out", async () => {
    supabase.from.mockReturnValue(
      makeQueryBuilder({
        data: [
          {
            id: null,
            docket_number: "A1",
            docket_type: "concrete",
            docket_date: "2026-08-01",
            truck_number: "101",
            total_time_on_site: "00:10:00",
            waiting_time: null,
          },
        ],
        error: null,
      })
    );

    const result = await getTurnaroundData("2026-08-01", "2026-08-31");

    expect(result.dockets).toEqual([]);
    expect(result.totalDockets).toBe(0);
  });

  test("no dockets returns null stats rather than dividing by zero", async () => {
    supabase.from.mockReturnValue(makeQueryBuilder({ data: [], error: null }));

    const result = await getTurnaroundData("2026-08-01", "2026-08-31");

    expect(result.siteStats).toEqual({ count: 0, avg: null, median: null });
    expect(result.waitStats).toEqual({ count: 0, avg: null, median: null });
  });

  test("throws with the underlying message on error", async () => {
    supabase.from.mockReturnValue(
      makeQueryBuilder({ error: { message: "query failed" } })
    );

    await expect(
      getTurnaroundData("2026-08-01", "2026-08-31")
    ).rejects.toThrow("Failed to load turnaround data: query failed");
  });
});

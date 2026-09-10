import { beforeEach, describe, expect, test, vi } from "vitest";
import { makeQueryBuilder, makeSupabaseMock } from "@/test/supabase-mock";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { getDailyVolume } from "@/lib/queries/trends";

describe("getDailyVolume", () => {
  let supabase: ReturnType<typeof makeSupabaseMock>;

  beforeEach(() => {
    supabase = makeSupabaseMock();
    vi.mocked(createClient).mockResolvedValue(supabase as never);
  });

  test("groups by date, sums per docket type, and sorts ascending", async () => {
    supabase.rpc.mockReturnValue(
      makeQueryBuilder({
        data: [
          { docket_date: "2026-08-02", docket_type: "concrete", total_quantity: 7, load_count: 1 },
          { docket_date: "2026-08-01", docket_type: "concrete", total_quantity: 5, load_count: 1 },
          { docket_date: "2026-08-01", docket_type: "aggregates", total_quantity: 30, load_count: 2 },
        ],
        error: null,
      })
    );

    const result = await getDailyVolume("2026-08-01", "2026-08-31");

    expect(result).toEqual([
      {
        date: "2026-08-01",
        concreteM3: 5,
        aggregatesTonnes: 30,
        concreteLoads: 1,
        aggregatesLoads: 2,
      },
      {
        date: "2026-08-02",
        concreteM3: 7,
        aggregatesTonnes: 0,
        concreteLoads: 1,
        aggregatesLoads: 0,
      },
    ]);
  });

  test("rows with no docket_date are skipped", async () => {
    supabase.rpc.mockReturnValue(
      makeQueryBuilder({
        data: [
          { docket_date: null, docket_type: "concrete", total_quantity: 7, load_count: 1 },
        ],
        error: null,
      })
    );

    expect(await getDailyVolume("2026-08-01", "2026-08-31")).toEqual([]);
  });

  test("no data returns an empty array", async () => {
    supabase.rpc.mockReturnValue(makeQueryBuilder({ data: null, error: null }));

    expect(await getDailyVolume("2026-08-01", "2026-08-31")).toEqual([]);
  });

  test("throws with the underlying message on error", async () => {
    supabase.rpc.mockReturnValue(
      makeQueryBuilder({ error: { message: "rpc exploded" } })
    );

    await expect(getDailyVolume("2026-08-01", "2026-08-31")).rejects.toThrow(
      "Failed to load daily volume: rpc exploded"
    );
  });
});

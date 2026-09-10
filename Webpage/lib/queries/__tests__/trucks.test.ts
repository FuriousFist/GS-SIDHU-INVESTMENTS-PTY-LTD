import { beforeEach, describe, expect, test, vi } from "vitest";
import { makeQueryBuilder, makeSupabaseMock } from "@/test/supabase-mock";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { getTruckDockets, getTruckSummary } from "@/lib/queries/trucks";

describe("getTruckSummary", () => {
  let supabase: ReturnType<typeof makeSupabaseMock>;

  beforeEach(() => {
    supabase = makeSupabaseMock();
    vi.mocked(createClient).mockResolvedValue(supabase as never);
  });

  test("returns rpc data", async () => {
    supabase.rpc.mockReturnValue(
      makeQueryBuilder({ data: [{ truck_id: "t1" }], error: null })
    );

    expect(await getTruckSummary("2026-08-01", "2026-08-31")).toEqual([
      { truck_id: "t1" },
    ]);
    expect(supabase.rpc).toHaveBeenCalledWith("get_truck_summary", {
      date_from: "2026-08-01",
      date_to: "2026-08-31",
    });
  });

  test("null data defaults to an empty array", async () => {
    supabase.rpc.mockReturnValue(makeQueryBuilder({ data: null, error: null }));

    expect(await getTruckSummary("2026-08-01", "2026-08-31")).toEqual([]);
  });

  test("throws with the underlying message on error", async () => {
    supabase.rpc.mockReturnValue(
      makeQueryBuilder({ error: { message: "rpc failed" } })
    );

    await expect(getTruckSummary("2026-08-01", "2026-08-31")).rejects.toThrow(
      "Failed to load truck summary: rpc failed"
    );
  });
});

describe("getTruckDockets", () => {
  let supabase: ReturnType<typeof makeSupabaseMock>;

  beforeEach(() => {
    supabase = makeSupabaseMock();
    vi.mocked(createClient).mockResolvedValue(supabase as never);
  });

  test("returns the truck's dockets when it has a truck_number", async () => {
    supabase.from
      .mockReturnValueOnce(
        makeQueryBuilder({
          data: { id: "t1", truck_number: "101" },
          error: null,
        })
      )
      .mockReturnValueOnce(
        makeQueryBuilder({ data: [{ id: "d1" }], error: null })
      );

    const result = await getTruckDockets("t1", "2026-08-01", "2026-08-31");

    expect(result).toEqual({
      truck: { id: "t1", truck_number: "101" },
      dockets: [{ id: "d1" }],
    });
  });

  test("truck with no truck_number short-circuits to an empty docket list", async () => {
    supabase.from.mockReturnValueOnce(
      makeQueryBuilder({ data: { id: "t1", truck_number: null }, error: null })
    );

    const result = await getTruckDockets("t1", "2026-08-01", "2026-08-31");

    expect(result).toEqual({
      truck: { id: "t1", truck_number: null },
      dockets: [],
    });
    // Only the truck lookup ran - no second .from() call for dockets.
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });

  test("throws when the truck lookup errors", async () => {
    supabase.from.mockReturnValueOnce(
      makeQueryBuilder({ error: { message: "not found" } })
    );

    await expect(
      getTruckDockets("missing", "2026-08-01", "2026-08-31")
    ).rejects.toThrow("Failed to load truck: not found");
  });

  test("throws when the dockets lookup errors", async () => {
    supabase.from
      .mockReturnValueOnce(
        makeQueryBuilder({ data: { id: "t1", truck_number: "101" }, error: null })
      )
      .mockReturnValueOnce(
        makeQueryBuilder({ error: { message: "dockets unavailable" } })
      );

    await expect(
      getTruckDockets("t1", "2026-08-01", "2026-08-31")
    ).rejects.toThrow("Failed to load truck dockets: dockets unavailable");
  });
});

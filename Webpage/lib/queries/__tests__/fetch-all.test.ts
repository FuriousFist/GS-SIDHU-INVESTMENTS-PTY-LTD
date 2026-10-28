import { describe, expect, test, vi } from "vitest";
import { fetchAllRows, PAGE_SIZE } from "@/lib/queries/fetch-all";

describe("fetchAllRows", () => {
  test("keeps paging past the row cap until a short page comes back", async () => {
    const rows = Array.from({ length: PAGE_SIZE + 5 }, (_, i) => i);
    const page = vi.fn(async (from: number, to: number) => ({
      data: rows.slice(from, to + 1),
      error: null,
    }));

    const result = await fetchAllRows(page);

    expect(result.data).toHaveLength(PAGE_SIZE + 5);
    expect(page).toHaveBeenCalledTimes(2);
    expect(page).toHaveBeenLastCalledWith(PAGE_SIZE, 2 * PAGE_SIZE - 1);
  });

  test("returns the error from a failed page", async () => {
    const result = await fetchAllRows(async () => ({
      data: null,
      error: { message: "db down" },
    }));

    expect(result.error).toEqual({ message: "db down" });
  });
});

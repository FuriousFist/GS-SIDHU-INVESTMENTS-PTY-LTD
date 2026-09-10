import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { resolveDateRange } from "@/lib/utils/date-range";

describe("resolveDateRange", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("valid from/to are passed through", () => {
    expect(resolveDateRange({ from: "2026-08-01", to: "2026-08-31" })).toEqual(
      { from: "2026-08-01", to: "2026-08-31" }
    );
  });

  test("missing params default to the last 30 days", () => {
    expect(resolveDateRange({})).toEqual({
      from: "2026-08-16",
      to: "2026-09-15",
    });
  });

  test("invalid date strings fall back to the default", () => {
    expect(
      resolveDateRange({ from: "not-a-date", to: "also-not-a-date" })
    ).toEqual({ from: "2026-08-16", to: "2026-09-15" });
  });

  test("array-valued params use the first entry", () => {
    expect(
      resolveDateRange({ from: ["2026-08-01", "2026-08-02"], to: "2026-08-31" })
    ).toEqual({ from: "2026-08-01", to: "2026-08-31" });
  });

  test("only one bound provided - the other still defaults", () => {
    expect(resolveDateRange({ from: "2026-08-01" })).toEqual({
      from: "2026-08-01",
      to: "2026-09-15",
    });
  });
});

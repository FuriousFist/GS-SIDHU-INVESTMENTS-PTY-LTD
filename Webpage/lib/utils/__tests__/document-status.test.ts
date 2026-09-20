import { describe, expect, test } from "vitest";
import {
  EXPIRING_WITHIN_DAYS,
  getDocumentStatus,
  statusSortRank,
  todayInMelbourne,
  worstStatus,
} from "@/lib/utils/document-status";

// Noon UTC on 15 Sep 2026 is 22:00 the same day in Melbourne (AEST).
const TODAY = new Date("2026-09-15T12:00:00Z");

function status(expiryDate: string | null, neverExpires = false) {
  return getDocumentStatus({
    hasFile: true,
    neverExpires,
    expiryDate,
    today: TODAY,
  });
}

describe("getDocumentStatus", () => {
  test("no file is missing regardless of dates", () => {
    expect(
      getDocumentStatus({
        hasFile: false,
        neverExpires: false,
        expiryDate: "2030-01-01",
        today: TODAY,
      })
    ).toBe("missing");
    expect(
      getDocumentStatus({
        hasFile: false,
        neverExpires: true,
        expiryDate: null,
        today: TODAY,
      })
    ).toBe("missing");
  });

  test("never expires is verified even with a stale date", () => {
    expect(status("2020-01-01", true)).toBe("verified");
    expect(status(null, true)).toBe("verified");
  });

  test("yesterday is expired", () => {
    expect(status("2026-09-14")).toBe("expired");
  });

  test("today is expiring, not expired", () => {
    expect(status("2026-09-15")).toBe("expiring");
  });

  test("exactly 30 days out is expiring", () => {
    expect(EXPIRING_WITHIN_DAYS).toBe(30);
    expect(status("2026-10-15")).toBe("expiring");
  });

  test("31 days out is verified", () => {
    expect(status("2026-10-16")).toBe("verified");
  });

  test("compares against the Melbourne date, not UTC", () => {
    // 15:00 UTC on 14 Sep is already 01:00 on 15 Sep in Melbourne, so a
    // document expiring 14 Sep is expired there even though it's still
    // the 14th in UTC.
    const lateUtc = new Date("2026-09-14T15:00:00Z");
    expect(todayInMelbourne(lateUtc)).toBe("2026-09-15");
    expect(
      getDocumentStatus({
        hasFile: true,
        neverExpires: false,
        expiryDate: "2026-09-14",
        today: lateUtc,
      })
    ).toBe("expired");
  });

  test("accepts timestamps by using only the date part", () => {
    expect(status("2026-09-14T00:00:00")).toBe("expired");
  });
});

describe("worstStatus / statusSortRank", () => {
  test("orders expired > expiring > missing > verified", () => {
    expect(statusSortRank("expired")).toBeLessThan(statusSortRank("expiring"));
    expect(statusSortRank("expiring")).toBeLessThan(statusSortRank("missing"));
    expect(statusSortRank("missing")).toBeLessThan(statusSortRank("verified"));
  });

  test("picks the worst status present", () => {
    expect(worstStatus(["verified", "missing", "expiring"])).toBe("expiring");
    expect(worstStatus(["verified", "expired", "expiring"])).toBe("expired");
    expect(worstStatus(["verified", "missing"])).toBe("missing");
    expect(worstStatus(["verified"])).toBe("verified");
  });

  test("an empty list is verified", () => {
    expect(worstStatus([])).toBe("verified");
  });
});

import { describe, expect, test } from "vitest";
import {
  formatDate,
  formatDuration,
  formatMinutes,
  formatQuantity,
  parseIntervalMinutes,
} from "@/lib/utils/format";

describe("formatQuantity", () => {
  test.each([
    [30.24, "tonnes", "30.24 t"],
    [7.2, "m3", "7.2 m³"],
    [1234, "tonnes", "1,234 t"],
  ] as const)("formats %s %s as %s", (value, unit, expected) => {
    expect(formatQuantity(value, unit)).toBe(expected);
  });

  test("null returns a dash", () => {
    expect(formatQuantity(null, "m3")).toBe("-");
  });
});

describe("formatDate", () => {
  test("formats an ISO date in en-AU day/month/year style", () => {
    // The month abbreviation's exact spelling ("Sep" vs "Sept") depends
    // on the runtime's ICU data, so this derives the expected string
    // from the same Intl call rather than hardcoding one spelling.
    const expected = new Date("2026-09-02").toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    expect(formatDate("2026-09-02")).toBe(expected);
    expect(formatDate("2026-09-02")).toMatch(/^02 \w+ 2026$/);
  });

  test("null returns a dash", () => {
    expect(formatDate(null)).toBe("-");
  });
});

describe("formatMinutes", () => {
  test("under an hour shows minutes only", () => {
    expect(formatMinutes(37)).toBe("37m");
  });

  test("over an hour shows hours and minutes", () => {
    expect(formatMinutes(127)).toBe("2h 7m");
  });

  test("exact hour shows zero minutes", () => {
    expect(formatMinutes(120)).toBe("2h 0m");
  });

  test("null returns a dash", () => {
    expect(formatMinutes(null)).toBe("-");
  });
});

describe("parseIntervalMinutes", () => {
  test("parses a plain HH:MM:SS interval", () => {
    expect(parseIntervalMinutes("02:07:00")).toBe(127);
  });

  test("parses an interval spanning multiple days", () => {
    // 1 day + 2:07:00 = 26h07m = 1567 minutes
    expect(parseIntervalMinutes("1 day 02:07:00")).toBe(1567);
  });

  test("parses multiple days", () => {
    expect(parseIntervalMinutes("2 days 00:00:00")).toBe(2880);
  });

  test("null returns null", () => {
    expect(parseIntervalMinutes(null)).toBeNull();
  });

  test("unparseable value returns null", () => {
    expect(parseIntervalMinutes("garbage")).toBeNull();
  });
});

describe("formatDuration", () => {
  test("formats a parseable interval via formatMinutes", () => {
    expect(formatDuration("02:07:00")).toBe("2h 7m");
  });

  test("null returns a dash", () => {
    expect(formatDuration(null)).toBe("-");
  });

  test("unparseable value is returned as-is", () => {
    expect(formatDuration("garbage")).toBe("garbage");
  });
});

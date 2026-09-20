import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { DateRangeFilter } from "@/components/date-range-filter";

describe("DateRangeFilter", () => {
  test("pre-fills the from/to inputs and submits to the given pathname", () => {
    render(
      <DateRangeFilter from="2026-08-01" to="2026-08-31" pathname="/trucks" />
    );

    // next/form: a string action is a GET-style navigation to that path
    // with the fields encoded as search params.
    const form = screen.getByRole("button", { name: "Apply" }).closest("form");
    expect(form).toHaveAttribute("action", "/trucks");
    expect(form).not.toHaveAttribute("method");

    const fromInput = screen.getByLabelText("From") as HTMLInputElement;
    const toInput = screen.getByLabelText("To") as HTMLInputElement;

    expect(fromInput.value).toBe("2026-08-01");
    expect(fromInput.name).toBe("from");
    expect(toInput.value).toBe("2026-08-31");
    expect(toInput.name).toBe("to");
  });
});

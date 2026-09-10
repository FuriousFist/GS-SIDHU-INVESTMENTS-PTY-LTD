import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { DocketFilters } from "@/components/dockets/docket-filters";

describe("DocketFilters", () => {
  test("pre-fills all fields from props", () => {
    render(
      <DocketFilters
        from="2026-08-01"
        to="2026-08-31"
        docketType="concrete"
        search="Winslow"
      />
    );

    expect((screen.getByLabelText("From") as HTMLInputElement).value).toBe(
      "2026-08-01"
    );
    expect((screen.getByLabelText("To") as HTMLInputElement).value).toBe(
      "2026-08-31"
    );
    expect((screen.getByLabelText("Type") as HTMLSelectElement).value).toBe(
      "concrete"
    );
    expect(
      (screen.getByLabelText("Search (docket # or customer)") as HTMLInputElement)
        .value
    ).toBe("Winslow");
  });

  test("undefined docketType/search default to blank/all", () => {
    render(<DocketFilters from="2026-08-01" to="2026-08-31" />);

    expect((screen.getByLabelText("Type") as HTMLSelectElement).value).toBe(
      ""
    );
    expect(
      (screen.getByLabelText("Search (docket # or customer)") as HTMLInputElement)
        .value
    ).toBe("");
  });

  test("submits as a GET form with the expected field names", () => {
    render(<DocketFilters from="2026-08-01" to="2026-08-31" />);

    const form = screen.getByRole("button", { name: "Apply" }).closest("form");
    expect(form).toHaveAttribute("method", "GET");

    expect(screen.getByLabelText("From")).toHaveAttribute("name", "from");
    expect(screen.getByLabelText("To")).toHaveAttribute("name", "to");
    expect(screen.getByLabelText("Type")).toHaveAttribute("name", "type");
    expect(
      screen.getByLabelText("Search (docket # or customer)")
    ).toHaveAttribute("name", "q");
  });
});

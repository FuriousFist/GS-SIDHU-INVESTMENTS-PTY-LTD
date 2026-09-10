import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatTile } from "@/components/stat-tile";

describe("StatTile", () => {
  test("renders label and value", () => {
    render(<StatTile label="Total Dockets" value="128" />);

    expect(screen.getByText("Total Dockets")).toBeInTheDocument();
    expect(screen.getByText("128")).toBeInTheDocument();
  });

  test("renders caption when provided", () => {
    render(
      <StatTile label="Trucks" value="12" caption="Active this period" />
    );

    expect(screen.getByText("Active this period")).toBeInTheDocument();
  });

  test("omits caption element when not provided", () => {
    const { container } = render(<StatTile label="Trucks" value="12" />);

    expect(container.querySelectorAll("p")).toHaveLength(2);
  });
});

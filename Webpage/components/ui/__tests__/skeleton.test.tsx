import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  ChartSkeleton,
  FilterBarSkeleton,
  Skeleton,
  StatTileSkeleton,
  TableSkeleton,
} from "@/components/ui/skeleton";

describe("Skeleton helpers", () => {
  test("Skeleton is a pulsing, aria-hidden block that merges className", () => {
    const { container } = render(<Skeleton className="h-4 w-10" />);

    const el = container.firstElementChild!;
    expect(el).toHaveAttribute("aria-hidden", "true");
    expect(el).toHaveClass("animate-pulse", "bg-neutral-200", "h-4", "w-10");
  });

  test("StatTileSkeleton uses the same card padding as StatTile", () => {
    const { container } = render(<StatTileSkeleton caption />);

    expect(container.firstElementChild).toHaveClass("p-5", "rounded-lg");
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(3);
  });

  test("TableSkeleton renders the requested rows and cols", () => {
    render(<TableSkeleton rows={4} cols={3} />);

    expect(screen.getAllByRole("row")).toHaveLength(5); // header + 4
    expect(screen.getAllByRole("columnheader")).toHaveLength(3);
    expect(screen.getAllByRole("cell")).toHaveLength(12);
  });

  test("ChartSkeleton reserves the chart height", () => {
    const { container } = render(<ChartSkeleton height={260} />);

    const plot = container.querySelectorAll(".animate-pulse")[1] as HTMLElement;
    expect(plot.style.height).toBe("260px");
  });

  test("FilterBarSkeleton renders one block per field plus the button", () => {
    const { container } = render(<FilterBarSkeleton fields={3} search />);

    // 3 fields x (label + input) + search (label + input) + Apply button
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(9);
  });
});

import { describe, expect, test } from "vitest";
import { render } from "@testing-library/react";
import OverviewLoading from "@/app/(dashboard)/loading";
import DocketsLoading from "@/app/(dashboard)/dockets/loading";
import DocketDetailLoading from "@/app/(dashboard)/dockets/[docketId]/loading";
import TrucksLoading from "@/app/(dashboard)/trucks/loading";
import TruckDetailLoading from "@/app/(dashboard)/trucks/[truckId]/loading";
import TrendsLoading from "@/app/(dashboard)/trends/loading";
import TurnaroundLoading from "@/app/(dashboard)/turnaround/loading";
import DriversLoading from "@/app/(dashboard)/drivers/loading";

// Smoke test: every route's loading.tsx renders a busy region containing
// at least one pulsing skeleton block.
const LOADING_SCREENS = [
  ["overview", OverviewLoading],
  ["dockets", DocketsLoading],
  ["dockets/[docketId]", DocketDetailLoading],
  ["trucks", TrucksLoading],
  ["trucks/[truckId]", TruckDetailLoading],
  ["trends", TrendsLoading],
  ["turnaround", TurnaroundLoading],
  ["drivers", DriversLoading],
] as const;

describe("loading screens", () => {
  test.each(LOADING_SCREENS)("%s loading.tsx renders", (_name, Loading) => {
    const { container } = render(<Loading />);

    expect(container.firstElementChild).toHaveAttribute("aria-busy", "true");
    expect(
      container.querySelectorAll(".animate-pulse").length
    ).toBeGreaterThan(0);
  });
});

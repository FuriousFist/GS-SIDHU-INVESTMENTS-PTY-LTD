import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DocketTable } from "@/components/dockets/docket-table";
import type { Database } from "@/types/database.types";

type DocketSummaryRow = Database["public"]["Views"]["docket_summary"]["Row"];

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

function makeDocket(id: string, docketNumber: string): DocketSummaryRow {
  return {
    id,
    docket_date: "2026-08-15",
    docket_number: docketNumber,
    docket_type: "concrete",
    customer_name: "Acme Pty Ltd",
    plant_name: "Epping",
    truck_number: "4309",
    total_m3: 7,
    total_tonnes: null,
  } as DocketSummaryRow;
}

describe("DocketTable", () => {
  test("empty list shows a message instead of a table", () => {
    render(<DocketTable dockets={[]} />);

    expect(
      screen.getByText("No dockets match these filters.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  test("renders one row per docket", () => {
    render(
      <DocketTable
        dockets={[makeDocket("1", "AAA111"), makeDocket("2", "BBB222")]}
      />
    );

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("AAA111")).toBeInTheDocument();
    expect(screen.getByText("BBB222")).toBeInTheDocument();
  });
});

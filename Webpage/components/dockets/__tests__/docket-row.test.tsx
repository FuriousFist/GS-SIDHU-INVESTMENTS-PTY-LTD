import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DocketRow } from "@/components/dockets/docket-row";
import type { Database } from "@/types/database.types";

type DocketSummaryRow = Database["public"]["Views"]["docket_summary"]["Row"];

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

function makeDocket(
  overrides: Partial<DocketSummaryRow> = {}
): DocketSummaryRow {
  return {
    id: "docket-1",
    docket_date: "2026-08-15",
    docket_number: "48851948",
    docket_type: "concrete",
    customer_name: "Acme Pty Ltd",
    plant_name: "Epping",
    truck_number: "4309",
    total_m3: 7,
    total_tonnes: null,
    ...overrides,
  } as DocketSummaryRow;
}

describe("DocketRow", () => {
  test("renders formatted fields for a concrete docket", () => {
    render(
      <table>
        <tbody>
          <DocketRow docket={makeDocket()} />
        </tbody>
      </table>
    );

    expect(screen.getByText("48851948")).toBeInTheDocument();
    expect(screen.getByText("concrete")).toBeInTheDocument();
    expect(screen.getByText("Acme Pty Ltd")).toBeInTheDocument();
    expect(screen.getByText("Epping")).toBeInTheDocument();
    expect(screen.getByText("4309")).toBeInTheDocument();
    expect(screen.getByText("7 m³")).toBeInTheDocument();
  });

  test("aggregates dockets show tonnes instead of m3", () => {
    render(
      <table>
        <tbody>
          <DocketRow
            docket={makeDocket({
              docket_type: "aggregates",
              total_m3: null,
              total_tonnes: 30.24,
            })}
          />
        </tbody>
      </table>
    );

    expect(screen.getByText("30.24 t")).toBeInTheDocument();
  });

  test("missing customer/plant/truck fall back to placeholders", () => {
    render(
      <table>
        <tbody>
          <DocketRow
            docket={makeDocket({
              customer_name: null,
              plant_name: null,
              truck_number: null,
            })}
          />
        </tbody>
      </table>
    );

    expect(screen.getAllByText("-")).toHaveLength(2);
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
  });

  test("clicking the row navigates to the docket detail page", async () => {
    push.mockClear();
    const user = userEvent.setup();

    render(
      <table>
        <tbody>
          <DocketRow docket={makeDocket({ id: "docket-42" })} />
        </tbody>
      </table>
    );

    await user.click(screen.getByText("48851948"));

    expect(push).toHaveBeenCalledWith("/dockets/docket-42");
  });
});

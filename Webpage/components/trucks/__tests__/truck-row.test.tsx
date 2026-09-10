import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TruckRow } from "@/components/trucks/truck-row";
import type { Database } from "@/types/database.types";

type TruckSummaryRow =
  Database["public"]["Functions"]["get_truck_summary"]["Returns"][number];

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

function makeTruck(overrides: Partial<TruckSummaryRow> = {}): TruckSummaryRow {
  return {
    truck_id: "truck-1",
    truck_number: "4309",
    company: "GS Sidhu Investments",
    docket_count: 12,
    total_concrete_m3: 84,
    total_aggregates_tonnes: 0,
    last_docket_date: "2026-08-15",
    ...overrides,
  } as TruckSummaryRow;
}

describe("TruckRow", () => {
  test("renders truck fields with formatted quantities and date", () => {
    render(
      <table>
        <tbody>
          <TruckRow truck={makeTruck()} from="2026-08-01" to="2026-08-31" />
        </tbody>
      </table>
    );

    expect(screen.getByText("4309")).toBeInTheDocument();
    expect(screen.getByText("GS Sidhu Investments")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("84 m³")).toBeInTheDocument();
  });

  test("clicking a row with a truck_id navigates with the date range preserved", async () => {
    push.mockClear();
    const user = userEvent.setup();

    render(
      <table>
        <tbody>
          <TruckRow
            truck={makeTruck({ truck_id: "truck-9" })}
            from="2026-08-01"
            to="2026-08-31"
          />
        </tbody>
      </table>
    );

    await user.click(screen.getByText("4309"));

    expect(push).toHaveBeenCalledWith(
      "/trucks/truck-9?from=2026-08-01&to=2026-08-31"
    );
  });

  test("a row with no truck_id is not clickable", async () => {
    push.mockClear();
    const user = userEvent.setup();

    render(
      <table>
        <tbody>
          <TruckRow
            // The generated Supabase type marks these non-nullable, but
            // TruckRow itself defensively handles null (truck.truck_id
            // ? ... : undefined, truck.company ?? "-") - the SQL
            // function's LEFT JOIN can return null in practice.
            truck={makeTruck(
              { truck_id: null, company: null } as unknown as Partial<TruckSummaryRow>
            )}
            from="2026-08-01"
            to="2026-08-31"
          />
        </tbody>
      </table>
    );

    const row = screen.getByText("4309").closest("tr")!;
    expect(row).not.toHaveClass("cursor-pointer");

    await user.click(row);

    expect(push).not.toHaveBeenCalled();
  });
});

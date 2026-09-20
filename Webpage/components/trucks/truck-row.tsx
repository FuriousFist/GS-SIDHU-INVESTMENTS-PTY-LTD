import { ClickableRow } from "@/components/clickable-row";
import { formatDate, formatQuantity } from "@/lib/utils/format";
import type { Database } from "@/types/database.types";

type TruckSummaryRow =
  Database["public"]["Functions"]["get_truck_summary"]["Returns"][number];

const ROW_CLASSES = "border-b border-neutral-100 last:border-0";

export function TruckRow({
  truck,
  from,
  to,
}: {
  truck: TruckSummaryRow;
  from: string;
  to: string;
}) {
  const cells = (
    <>
      <td className="px-4 py-3 font-medium text-neutral-900">
        {truck.truck_number}
      </td>
      <td className="px-4 py-3 text-neutral-600">{truck.company ?? "-"}</td>
      <td className="px-4 py-3 text-right text-neutral-600">
        {truck.docket_count}
      </td>
      <td className="px-4 py-3 text-right text-neutral-600">
        {formatQuantity(truck.total_concrete_m3, "m3")}
      </td>
      <td className="px-4 py-3 text-right text-neutral-600">
        {formatQuantity(truck.total_aggregates_tonnes, "tonnes")}
      </td>
      <td className="px-4 py-3 text-neutral-600">
        {formatDate(truck.last_docket_date)}
      </td>
    </>
  );

  // The "Unassigned" bucket has no truck_id and nothing to navigate to.
  if (!truck.truck_id) {
    return <tr className={ROW_CLASSES}>{cells}</tr>;
  }

  return (
    <ClickableRow
      href={`/trucks/${truck.truck_id}?from=${from}&to=${to}`}
      className={`${ROW_CLASSES} hover:bg-neutral-50`}
    >
      {cells}
    </ClickableRow>
  );
}

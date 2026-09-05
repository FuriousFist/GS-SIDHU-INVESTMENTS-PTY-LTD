"use client";

import { useRouter } from "next/navigation";
import { formatDate, formatQuantity } from "@/lib/utils/format";
import type { Database } from "@/types/database.types";

type TruckSummaryRow =
  Database["public"]["Functions"]["get_truck_summary"]["Returns"][number];

export function TruckRow({
  truck,
  from,
  to,
}: {
  truck: TruckSummaryRow;
  from: string;
  to: string;
}) {
  const router = useRouter();
  const href = truck.truck_id
    ? `/trucks/${truck.truck_id}?from=${from}&to=${to}`
    : undefined;

  return (
    <tr
      onClick={href ? () => router.push(href) : undefined}
      className={`border-b border-neutral-100 last:border-0 hover:bg-neutral-50 ${
        href ? "cursor-pointer" : ""
      }`}
    >
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
    </tr>
  );
}

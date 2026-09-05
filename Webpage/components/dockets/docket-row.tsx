"use client";

import { useRouter } from "next/navigation";
import { formatDate, formatQuantity } from "@/lib/utils/format";
import type { Database } from "@/types/database.types";

type DocketSummaryRow = Database["public"]["Views"]["docket_summary"]["Row"];

export function DocketRow({ docket }: { docket: DocketSummaryRow }) {
  const router = useRouter();

  return (
    <tr
      onClick={() => router.push(`/dockets/${docket.id}`)}
      className="cursor-pointer border-b border-neutral-100 last:border-0 hover:bg-neutral-50"
    >
      <td className="px-4 py-3 text-neutral-600">
        {formatDate(docket.docket_date)}
      </td>
      <td className="px-4 py-3 font-medium text-neutral-900">
        {docket.docket_number}
      </td>
      <td className="px-4 py-3 capitalize text-neutral-600">
        {docket.docket_type}
      </td>
      <td className="px-4 py-3 text-neutral-600">
        {docket.customer_name ?? "-"}
      </td>
      <td className="px-4 py-3 text-neutral-600">
        {docket.plant_name ?? "-"}
      </td>
      <td className="px-4 py-3 text-neutral-600">
        {docket.truck_number ?? "Unassigned"}
      </td>
      <td className="px-4 py-3 text-right text-neutral-900">
        {docket.docket_type === "aggregates"
          ? formatQuantity(docket.total_tonnes, "tonnes")
          : formatQuantity(docket.total_m3, "m3")}
      </td>
    </tr>
  );
}

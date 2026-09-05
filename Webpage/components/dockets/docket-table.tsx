import { DocketRow } from "@/components/dockets/docket-row";
import type { Database } from "@/types/database.types";

type DocketSummaryRow = Database["public"]["Views"]["docket_summary"]["Row"];

export function DocketTable({ dockets }: { dockets: DocketSummaryRow[] }) {
  if (dockets.length === 0) {
    return (
      <p className="rounded-lg border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500">
        No dockets match these filters.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-xs font-medium uppercase text-neutral-500">
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Docket #</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Plant</th>
            <th className="px-4 py-3">Truck</th>
            <th className="px-4 py-3 text-right">Quantity</th>
          </tr>
        </thead>
        <tbody>
          {dockets.map((docket) => (
            <DocketRow key={docket.id} docket={docket} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

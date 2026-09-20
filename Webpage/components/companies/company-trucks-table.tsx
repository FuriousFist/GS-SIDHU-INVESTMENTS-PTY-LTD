import { ClickableRow } from "@/components/clickable-row";
import { StatusPill } from "@/components/documents/status-pill";
import { formatDate } from "@/lib/utils/format";
import type { CompanyTruck } from "@/lib/queries/companies";

function truckTypeLabel(type: string | null) {
  if (type === "agitator") return "Agitator";
  if (type === "tipper") return "Tipper";
  return "-";
}

/** The company's fleet, like the Holcim Transport page. */
export function CompanyTrucksTable({
  companyId,
  trucks,
}: {
  companyId: string;
  trucks: CompanyTruck[];
}) {
  if (trucks.length === 0) {
    return (
      <p className="rounded-lg border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500">
        No trucks are linked to this company yet. Set a truck&apos;s company
        from its page.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-xs font-medium uppercase text-neutral-500">
            <th className="px-4 py-3">Truck #</th>
            <th className="px-4 py-3">Registration</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Reg. state</th>
            <th className="px-4 py-3">Base location</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Notes</th>
          </tr>
        </thead>
        <tbody>
          {trucks.map((truck) => (
            <ClickableRow
              key={truck.id}
              href={`/trucks/${truck.id}?from=/companies/${companyId}`}
              className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50"
            >
              <td className="px-4 py-3 font-medium text-neutral-900">
                {truck.truck_number ?? "Unassigned"}
              </td>
              <td className="px-4 py-3 text-neutral-600">
                {truck.registration ?? "-"}
              </td>
              <td className="px-4 py-3 text-neutral-600">
                {truckTypeLabel(truck.truck_type)}
                {truck.truck_type === "tipper" && (
                  <span className="block text-xs text-neutral-500">
                    Trailer: {truck.trailer?.registration ?? "not added"}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-neutral-600">
                {truck.registration_state ?? "-"}
              </td>
              <td className="px-4 py-3 text-neutral-600">
                {truck.base_location ?? "-"}
              </td>
              <td className="px-4 py-3">
                <StatusPill status={truck.summary.status} />
              </td>
              <td className="px-4 py-3 text-neutral-600">
                {truck.summary.attention
                  ? `${truck.summary.attention.name} · ${
                      truck.summary.attention.status === "expired"
                        ? "expired"
                        : "expires"
                    } ${formatDate(truck.summary.attention.expiryDate)}`
                  : ""}
              </td>
            </ClickableRow>
          ))}
        </tbody>
      </table>
    </div>
  );
}

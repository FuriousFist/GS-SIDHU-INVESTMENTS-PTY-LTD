import Link from "next/link";
import { StatusPill } from "@/components/documents/status-pill";
import type { CompanySummary } from "@/lib/queries/companies";
import type { DocumentStatus } from "@/lib/utils/document-status";

const SHOWN_STATUSES: DocumentStatus[] = ["expired", "expiring", "missing"];

export function CompanyCard({ company }: { company: CompanySummary }) {
  const counts = SHOWN_STATUSES.filter(
    (status) => company.statusCounts[status] > 0
  );
  const total = Object.values(company.statusCounts).reduce((a, b) => a + b, 0);

  return (
    <Link
      href={`/companies/${company.id}`}
      className="block rounded-lg border border-neutral-200 bg-white p-5 hover:border-neutral-300 hover:bg-neutral-50"
    >
      <p className="text-lg font-semibold text-neutral-900">{company.name}</p>
      <p className="mt-1 text-sm text-neutral-500">
        {company.supplier} &middot; Sole trader:{" "}
        {company.sole_trader ? "Yes" : "No"}
      </p>
      <p className="mt-3 text-sm text-neutral-600">
        {company.truckCount} {company.truckCount === 1 ? "truck" : "trucks"}
        {" · "}
        {total} {total === 1 ? "document" : "documents"}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {counts.length === 0 ? (
          <StatusPill status="verified" />
        ) : (
          counts.map((status) => (
            <span key={status} className="flex items-center gap-1 text-sm">
              <span className="text-neutral-700">
                {company.statusCounts[status]}
              </span>
              <StatusPill status={status} />
            </span>
          ))
        )}
      </div>
    </Link>
  );
}

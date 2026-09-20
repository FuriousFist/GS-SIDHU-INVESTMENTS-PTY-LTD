import Link from "next/link";
import { notFound } from "next/navigation";
import { getCompany } from "@/lib/queries/companies";
import type { SearchParams } from "@/lib/utils/date-range";
import type {
  DocumentCategory,
  DocumentSlot,
  DocumentTypeInfo,
} from "@/lib/utils/document-slots";
import { BackLink } from "@/components/back-link";
import { CompanyEditForm } from "@/components/companies/company-edit-form";
import { CompanyTrucksTable } from "@/components/companies/company-trucks-table";
import { AddDocumentForm } from "@/components/documents/add-document-form";
import { DocumentTable } from "@/components/documents/document-table";

type Tab = "insurance" | "other" | "trucks";

const TABS: { id: Tab; label: string }[] = [
  { id: "insurance", label: "Insurance" },
  { id: "other", label: "Other" },
  { id: "trucks", label: "Trucks" },
];

function resolveTab(value: string | string[] | undefined): Tab {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "other" || raw === "trucks" ? raw : "insurance";
}

function needsAttention(status: string) {
  return status === "expired" || status === "expiring";
}

function uniqueTypes(slots: DocumentSlot[]): DocumentTypeInfo[] {
  const seen = new Map<string, DocumentTypeInfo>();
  for (const slot of slots) seen.set(slot.documentType.id, slot.documentType);
  return [...seen.values()].sort((a, b) => a.sortOrder - b.sortOrder);
}

export default async function CompanyPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { companyId } = await params;
  const tab = resolveTab((await searchParams).tab);

  let result;
  try {
    result = await getCompany(companyId);
  } catch {
    notFound();
  }

  const { company, documents, trucks } = result;

  const byCategory = (category: DocumentCategory) =>
    documents.filter((slot) => slot.documentType.category === category);

  const badges: Record<Tab, number> = {
    insurance: byCategory("insurance").filter((s) => needsAttention(s.status))
      .length,
    other: byCategory("other").filter((s) => needsAttention(s.status)).length,
    trucks: trucks.filter((t) => needsAttention(t.summary.status)).length,
  };

  return (
    <div>
      <BackLink fallbackHref="/companies">&larr; Back to companies</BackLink>

      <div className="mt-2">
        <CompanyEditForm company={company} />
      </div>

      <nav
        aria-label="Company sections"
        className="mt-6 flex gap-1 border-b border-neutral-200"
      >
        {TABS.map((item) => {
          const active = item.id === tab;
          return (
            <Link
              key={item.id}
              href={`/companies/${company.id}?tab=${item.id}`}
              aria-current={active ? "page" : undefined}
              className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium ${
                active
                  ? "border-neutral-900 text-neutral-900"
                  : "border-transparent text-neutral-500 hover:text-neutral-800"
              }`}
            >
              {item.label}
              {badges[item.id] > 0 && (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-semibold leading-none text-white">
                  {badges[item.id]}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4">
        {tab === "trucks" ? (
          <CompanyTrucksTable companyId={company.id} trucks={trucks} />
        ) : (
          <div className="space-y-3">
            <AddDocumentForm
              companyId={company.id}
              types={uniqueTypes(byCategory(tab))}
            />
            <DocumentTable
              slots={byCategory(tab)}
              owner={{ scope: "company", ownerId: company.id }}
              emptyMessage={`No ${tab} document types are configured for ${company.supplier}.`}
            />
          </div>
        )}
      </div>
    </div>
  );
}

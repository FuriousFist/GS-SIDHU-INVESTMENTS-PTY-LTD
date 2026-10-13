import Link from "next/link";
import { Suspense } from "react";
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
import {
  CompanyDocumentsSkeleton,
  CompanyHeadingSkeleton,
  CompanyTrucksSkeleton,
} from "./loading";

// null when the company doesn't exist (or the query failed).
type CompanyResult = Awaited<ReturnType<typeof getCompany>> | null;

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

function byCategory(data: NonNullable<CompanyResult>, category: DocumentCategory) {
  return data.documents.filter(
    (slot) => slot.documentType.category === category
  );
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

  // One query shared by the heading, the tab badges and the tab contents.
  const result: Promise<CompanyResult> = getCompany(companyId).catch(
    () => null
  );

  return (
    <div>
      {/* The heading only depends on the company, so it keeps its key (and
          stays on screen) across tab changes. */}
      <Suspense key={companyId} fallback={<CompanyHeadingSkeleton />}>
        <CompanyHeading result={result} />
      </Suspense>

      <nav
        aria-label="Company sections"
        className="mt-6 flex gap-1 border-b border-neutral-200"
      >
        {TABS.map((item) => {
          const active = item.id === tab;
          return (
            <Link
              key={item.id}
              href={`/companies/${companyId}?tab=${item.id}`}
              aria-current={active ? "page" : undefined}
              className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium ${
                active
                  ? "border-neutral-900 text-neutral-900"
                  : "border-transparent text-neutral-500 hover:text-neutral-800"
              }`}
            >
              {item.label}
              <Suspense key={companyId} fallback={null}>
                <TabBadge result={result} tab={item.id} />
              </Suspense>
            </Link>
          );
        })}
      </nav>

      {/* Keyed on the tab so a tab change mounts a fresh boundary and shows
          the skeleton, rather than holding the previous tab on screen until
          the new data arrives (loading.tsx only covers route changes). */}
      <div className="mt-4">
        <Suspense
          key={`${companyId}:${tab}`}
          fallback={
            tab === "trucks" ? (
              <CompanyTrucksSkeleton />
            ) : (
              <CompanyDocumentsSkeleton />
            )
          }
        >
          <CompanyTabContent result={result} tab={tab} />
        </Suspense>
      </div>
    </div>
  );
}

async function CompanyHeading({ result }: { result: Promise<CompanyResult> }) {
  const data = await result;
  if (!data) notFound();

  return (
    <>
      <BackLink fallbackHref="/companies">&larr; Back to companies</BackLink>

      <div className="mt-2">
        <CompanyEditForm company={data.company} />
      </div>
    </>
  );
}

async function TabBadge({
  result,
  tab,
}: {
  result: Promise<CompanyResult>;
  tab: Tab;
}) {
  const data = await result;
  if (!data) return null;

  const count =
    tab === "trucks"
      ? data.trucks.filter((t) => needsAttention(t.summary.status)).length
      : byCategory(data, tab).filter((s) => needsAttention(s.status)).length;

  if (count === 0) return null;

  return (
    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-semibold leading-none text-white">
      {count}
    </span>
  );
}

async function CompanyTabContent({
  result,
  tab,
}: {
  result: Promise<CompanyResult>;
  tab: Tab;
}) {
  const data = await result;
  if (!data) notFound();

  const { company, trucks } = data;

  if (tab === "trucks") {
    return <CompanyTrucksTable companyId={company.id} trucks={trucks} />;
  }

  const slots = byCategory(data, tab);

  return (
    <div className="space-y-3">
      <AddDocumentForm companyId={company.id} types={uniqueTypes(slots)} />
      <DocumentTable
        slots={slots}
        owner={{ scope: "company", ownerId: company.id }}
        emptyMessage={`No ${tab} document types are configured for ${company.supplier}.`}
      />
    </div>
  );
}

import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { resolveDateRange, type SearchParams } from "@/lib/utils/date-range";
import { getTruckCompliance, getTruckDockets } from "@/lib/queries/trucks";
import { DateRangeFilter } from "@/components/date-range-filter";
import { StatTile } from "@/components/stat-tile";
import { DocketTable } from "@/components/dockets/docket-table";
import { BackLink } from "@/components/back-link";
import { DocumentTable } from "@/components/documents/document-table";
import { TrailerCard } from "@/components/trucks/trailer-card";
import { TruckDetailsCard } from "@/components/trucks/truck-details-card";
import {
  formatDate,
  formatMinutes,
  parseIntervalMinutes,
} from "@/lib/utils/format";
import {
  TruckDocumentsSkeleton,
  TruckHeadingSkeleton,
  TruckResultsSkeleton,
} from "./loading";

// null when the truck doesn't exist (or the query failed).
type TruckResult = Awaited<ReturnType<typeof getTruckDockets>> | null;
type ComplianceResult = Awaited<ReturnType<typeof getTruckCompliance>> | null;

type CameFrom = { href: string; companyId: string } | null;

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

// Only a company page is accepted as a "from" target, so the back link
// can't be pointed anywhere else via the URL.
const COMPANY_PATH = /^\/companies\/([0-9a-f-]{36})$/i;

function resolveFrom(value: string | undefined): CameFrom {
  const match = value ? COMPANY_PATH.exec(value) : null;
  return match ? { href: value!, companyId: match[1] } : null;
}

export default async function TruckDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ truckId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { truckId } = await params;
  const search = await searchParams;
  const { from, to } = resolveDateRange(search);
  const cameFrom = resolveFrom(firstParam(search.from));
  const docsTab = firstParam(search.docs) === "trailer" ? "trailer" : "truck";

  // One query shared by the heading and the stats/table below the filters.
  const result: Promise<TruckResult> = getTruckDockets(truckId, from, to).catch(
    () => null
  );
  // Companies, trailer and document checklists - shared by the details
  // card in the heading and the Documents section.
  const compliance: Promise<ComplianceResult> = result
    .then((data) => (data ? getTruckCompliance(data.truck) : null))
    .catch(() => null);

  return (
    <div>
      {/* The heading only depends on the truck, so it keeps its key (and
          stays on screen) across filter changes. */}
      <Suspense key={truckId} fallback={<TruckHeadingSkeleton />}>
        <TruckHeading
          result={result}
          compliance={compliance}
          cameFrom={cameFrom}
        />
      </Suspense>

      <div className="mt-4">
        <DateRangeFilter
          from={from}
          to={to}
          pathname={`/trucks/${truckId}`}
        />
      </div>

      {/* Keyed on the filters so a filter change mounts a fresh boundary and
          shows the skeleton, rather than holding the stale results on screen
          until the new data arrives (loading.tsx only covers route changes). */}
      <Suspense
        key={`${truckId}:${from}:${to}`}
        fallback={<TruckResultsSkeleton />}
      >
        <TruckResults result={result} />
      </Suspense>

      <h2 className="mt-8 mb-2 text-lg font-semibold text-neutral-900">
        Documents
      </h2>
      <Suspense
        key={`${truckId}:${docsTab}`}
        fallback={<TruckDocumentsSkeleton />}
      >
        <TruckDocuments
          result={result}
          compliance={compliance}
          docsTab={docsTab}
          cameFrom={cameFrom}
        />
      </Suspense>
    </div>
  );
}

async function TruckHeading({
  result,
  compliance,
  cameFrom,
}: {
  result: Promise<TruckResult>;
  compliance: Promise<ComplianceResult>;
  cameFrom: CameFrom;
}) {
  const data = await result;
  if (!data) notFound();

  const { truck } = data;
  const details = await compliance;

  const backToCompany =
    cameFrom && details?.company?.id === cameFrom.companyId
      ? details.company
      : null;

  return (
    <>
      <BackLink fallbackHref={cameFrom?.href ?? "/trucks"}>
        &larr; Back{backToCompany ? ` to ${backToCompany.name}` : ""}
      </BackLink>

      <h1 className="mt-2 text-2xl font-semibold text-neutral-900">
        Truck {truck.truck_number}
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        {truck.company ?? "Unknown company"} &middot;{" "}
        {truck.registration ?? "No registration on file"} &middot;{" "}
        {truck.active ? "Active" : "Inactive"}
      </p>

      <div className="mt-4">
        <TruckDetailsCard truck={truck} companies={details?.companies ?? []} />
      </div>
    </>
  );
}

async function TruckResults({ result }: { result: Promise<TruckResult> }) {
  const data = await result;
  if (!data) notFound();

  const { dockets } = data;

  const totalConcreteM3 = dockets.reduce(
    (sum, d) => sum + (d.docket_type === "concrete" ? d.total_m3 ?? 0 : 0),
    0
  );
  const totalAggregatesTonnes = dockets.reduce(
    (sum, d) =>
      sum + (d.docket_type === "aggregates" ? d.total_tonnes ?? 0 : 0),
    0
  );
  const totalLoads = dockets.reduce((sum, d) => sum + (d.load_count ?? 0), 0);

  const hasConcrete = dockets.some((d) => d.docket_type === "concrete");
  const hasAggregates = dockets.some((d) => d.docket_type === "aggregates");

  const siteMinutes = dockets
    .map((d) => parseIntervalMinutes(d.total_time_on_site))
    .filter((v): v is number => v !== null);
  const waitMinutes = dockets
    .map((d) => parseIntervalMinutes(d.waiting_time))
    .filter((v): v is number => v !== null);

  const customerCount = new Set(
    dockets.map((d) => d.customer_name).filter(Boolean)
  ).size;
  const plantCount = new Set(dockets.map((d) => d.plant_name).filter(Boolean))
    .size;

  const lastActive = dockets.reduce<string | null>((latest, d) => {
    if (!d.docket_date) return latest;
    if (!latest || d.docket_date > latest) return d.docket_date;
    return latest;
  }, null);

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatTile label="Dockets" value={dockets.length.toLocaleString()} />
        <StatTile label="Total loads" value={totalLoads.toLocaleString()} />
        {hasConcrete && (
          <StatTile
            label="Concrete delivered"
            value={`${totalConcreteM3.toLocaleString()} m³`}
          />
        )}
        {hasAggregates && (
          <StatTile
            label="Aggregates delivered"
            value={`${totalAggregatesTonnes.toLocaleString()} t`}
          />
        )}
        <StatTile
          label="Avg. time on site"
          value={formatMinutes(average(siteMinutes))}
          caption={`Based on ${siteMinutes.length} of ${dockets.length} dockets`}
        />
        <StatTile
          label="Avg. waiting time"
          value={formatMinutes(average(waitMinutes))}
          caption={`Based on ${waitMinutes.length} of ${dockets.length} dockets`}
        />
        <StatTile label="Customers served" value={customerCount.toString()} />
        <StatTile label="Plants used" value={plantCount.toString()} />
        <StatTile
          label="Last active"
          value={lastActive ? formatDate(lastActive) : "-"}
        />
      </div>

      <h2 className="mt-8 mb-2 text-lg font-semibold text-neutral-900">
        Dockets
      </h2>
      <DocketTable dockets={dockets} />
    </>
  );
}

async function TruckDocuments({
  result,
  compliance,
  docsTab,
  cameFrom,
}: {
  result: Promise<TruckResult>;
  compliance: Promise<ComplianceResult>;
  docsTab: "truck" | "trailer";
  cameFrom: CameFrom;
}) {
  const data = await result;
  if (!data) notFound();

  const { truck } = data;
  const details = await compliance;

  if (!details) {
    return (
      <p className="rounded-lg border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500">
        Documents are unavailable right now.
      </p>
    );
  }

  const truckOwner = { scope: "truck" as const, ownerId: truck.id };

  if (truck.truck_type !== "tipper") {
    return (
      <DocumentTable
        slots={details.truckDocuments}
        owner={truckOwner}
        emptyMessage={
          details.company || truck.company
            ? "No document types are configured for this truck."
            : "Link this truck to a company to see its document checklist."
        }
      />
    );
  }

  return (
    <>
      <nav
        aria-label="Document sections"
        className="mb-3 flex gap-1 border-b border-neutral-200"
      >
        {(["truck", "trailer"] as const).map((section) => {
          const active = section === docsTab;
          const query = new URLSearchParams();
          if (cameFrom) query.set("from", cameFrom.href);
          query.set("docs", section);
          return (
            <Link
              key={section}
              href={`/trucks/${truck.id}?${query.toString()}`}
              aria-current={active ? "page" : undefined}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium capitalize ${
                active
                  ? "border-neutral-900 text-neutral-900"
                  : "border-transparent text-neutral-500 hover:text-neutral-800"
              }`}
            >
              {section}
            </Link>
          );
        })}
      </nav>
      {docsTab === "trailer" ? (
        <div className="space-y-3">
          <TrailerCard truckId={truck.id} trailer={details.trailer} />
          {details.trailer && (
            <DocumentTable
              slots={details.trailerDocuments}
              owner={{ scope: "trailer", ownerId: details.trailer.id }}
            />
          )}
        </div>
      ) : (
        <DocumentTable slots={details.truckDocuments} owner={truckOwner} />
      )}
    </>
  );
}

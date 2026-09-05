import { notFound } from "next/navigation";
import { getDocketById } from "@/lib/queries/dockets";
import { BackLink } from "@/components/back-link";
import { formatDate, formatDuration, formatQuantity } from "@/lib/utils/format";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-neutral-500">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-neutral-900">{value ?? "-"}</dd>
    </div>
  );
}

export default async function DocketDetailPage({
  params,
}: {
  params: Promise<{ docketId: string }>;
}) {
  const { docketId } = await params;

  let result;
  try {
    result = await getDocketById(docketId);
  } catch {
    notFound();
  }

  const { docket, loads, pdfUrl } = result;

  return (
    <div>
      <BackLink fallbackHref="/dockets">&larr; Back</BackLink>

      <div className="mt-2 flex items-start justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900">
          Docket {docket.docket_number}
        </h1>
        {pdfUrl && (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            View PDF
          </a>
        )}
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-4 rounded-lg border border-neutral-200 bg-white p-6 sm:grid-cols-3">
        <Field label="Date" value={formatDate(docket.docket_date)} />
        <Field label="Type" value={docket.docket_type} />
        <Field label="Customer" value={docket.customer_name} />
        <Field label="Plant" value={docket.plant_name} />
        <Field label="Truck" value={docket.truck_number ?? "Unassigned"} />
        <Field label="Driver" value={docket.driver_name ?? "Not captured"} />
        <Field
          label="Time on site"
          value={formatDuration(docket.total_time_on_site)}
        />
        <Field
          label="Waiting time"
          value={formatDuration(docket.waiting_time)}
        />
      </dl>

      <h2 className="mt-8 mb-2 text-lg font-semibold text-neutral-900">
        Loads
      </h2>
      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs font-medium uppercase text-neutral-500">
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Material code</th>
              <th className="px-4 py-3 text-right">Quantity</th>
            </tr>
          </thead>
          <tbody>
            {loads.map((load) => (
              <tr
                key={load.id}
                className="border-b border-neutral-100 last:border-0"
              >
                <td className="px-4 py-3 text-neutral-900">
                  {load.product ?? "-"}
                </td>
                <td className="px-4 py-3 text-neutral-600">
                  {load.material_code ?? "-"}
                </td>
                <td className="px-4 py-3 text-right text-neutral-900">
                  {load.unit === "tonnes" || load.unit === "m3"
                    ? formatQuantity(load.quantity, load.unit)
                    : `${load.quantity ?? "-"} ${load.unit ?? ""}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

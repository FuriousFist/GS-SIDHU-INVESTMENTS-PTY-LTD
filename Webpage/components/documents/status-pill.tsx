import {
  STATUS_LABELS,
  type DocumentStatus,
} from "@/lib/utils/document-status";

const STATUS_CLASSES: Record<DocumentStatus, string> = {
  verified: "bg-green-100 text-green-800",
  expiring: "bg-amber-100 text-amber-800",
  expired: "bg-red-100 text-red-800",
  missing: "bg-neutral-200 text-neutral-700",
};

export function StatusPill({ status }: { status: DocumentStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${STATUS_CLASSES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

import { DocumentRow } from "@/components/documents/document-row";
import type { DocumentOwner } from "@/components/documents/upload-document-dialog";
import type { DocumentSlot } from "@/lib/utils/document-slots";

export function DocumentTable({
  slots,
  owner,
  emptyMessage = "No documents are required here.",
}: {
  slots: DocumentSlot[];
  owner: DocumentOwner;
  emptyMessage?: string;
}) {
  if (slots.length === 0) {
    return (
      <p className="rounded-lg border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-xs font-medium uppercase text-neutral-500">
            <th className="px-4 py-3">Document</th>
            <th className="px-4 py-3">Expiry date</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {slots.map((slot) => (
            <DocumentRow
              key={slot.documentId ?? `type:${slot.documentType.id}`}
              slot={slot}
              owner={owner}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

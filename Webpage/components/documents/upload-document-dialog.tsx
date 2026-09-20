"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import {
  updateDocumentExpiry,
  uploadDocumentVersion,
} from "@/app/actions/documents";
import type { DocumentScope, DocumentSlot } from "@/lib/utils/document-slots";
import { MAX_UPLOAD_BYTES } from "@/lib/utils/document-constants";
import {
  INPUT_CLASSES,
  LABEL_CLASSES,
  PRIMARY_BUTTON_CLASSES,
  SECONDARY_BUTTON_CLASSES,
} from "@/components/ui/form-classes";

export type DocumentOwner = { scope: DocumentScope; ownerId: string };

const OWNER_FIELDS: Record<DocumentScope, string> = {
  company: "companyId",
  truck: "truckId",
  trailer: "trailerId",
};

/**
 * Small modal for uploading a new version of a document, or (in "expiry"
 * mode) editing the current version's expiry without a new file.
 */
export function UploadDocumentDialog({
  mode,
  slot,
  owner,
  onClose,
}: {
  mode: "upload" | "expiry";
  slot: DocumentSlot;
  owner: DocumentOwner;
  onClose: () => void;
}) {
  const router = useRouter();
  const id = useId();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const current = slot.currentVersion;
  const [neverExpires, setNeverExpires] = useState(
    current ? current.neverExpires : slot.documentType.defaultNeverExpires
  );
  const [expiryDate, setExpiryDate] = useState(current?.expiryDate ?? "");

  const title =
    mode === "upload"
      ? current
        ? "Upload new version"
        : "Upload document"
      : "Edit expiry";

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = event.currentTarget;
    const formData = new FormData(form);

    if (mode === "upload") {
      const file = formData.get("file");
      if (!(file instanceof File) || file.size === 0) {
        setError("Choose a file to upload.");
        return;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        setError("File must be 10 MB or smaller.");
        return;
      }
    }

    if (!neverExpires && !expiryDate) {
      setError("Enter an expiry date or tick Never expire.");
      return;
    }

    startTransition(async () => {
      let result;

      if (mode === "upload") {
        if (slot.documentId) {
          formData.set("documentId", slot.documentId);
        } else {
          formData.set("documentTypeId", slot.documentType.id);
          formData.set(OWNER_FIELDS[owner.scope], owner.ownerId);
          if (slot.label) formData.set("label", slot.label);
        }
        result = await uploadDocumentVersion(formData);
      } else {
        result = await updateDocumentExpiry({
          documentId: slot.documentId!,
          expiryDate: neverExpires ? null : expiryDate,
          neverExpires,
        });
      }

      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.refresh();
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${id}-title`}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-5 shadow-lg"
      >
        <h3
          id={`${id}-title`}
          className="text-base font-semibold text-neutral-900"
        >
          {title}
        </h3>
        <p className="mt-1 text-sm text-neutral-500">
          {slot.documentType.name}
          {slot.label ? ` · ${slot.label}` : ""}
        </p>

        <div className="mt-4 space-y-3">
          {mode === "upload" && (
            <div>
              <label
                htmlFor={`${id}-file`}
                className={LABEL_CLASSES}
              >
                File
              </label>
              <input
                id={`${id}-file`}
                name="file"
                type="file"
                accept="application/pdf,image/*"
                required
                className="block w-full text-sm text-neutral-700 file:mr-3 file:rounded-md file:border file:border-neutral-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-neutral-700 hover:file:bg-neutral-50"
              />
              <p className="mt-1 text-xs text-neutral-500">
                PDF preferred, up to 10 MB. The previous version is kept in
                the history.
              </p>
            </div>
          )}

          <div>
            <label
              htmlFor={`${id}-expiry`}
              className={LABEL_CLASSES}
            >
              Expiry date
            </label>
            <input
              id={`${id}-expiry`}
              name="expiryDate"
              type="date"
              value={expiryDate}
              onChange={(event) => setExpiryDate(event.target.value)}
              disabled={neverExpires}
              className={INPUT_CLASSES}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              name="neverExpires"
              type="checkbox"
              checked={neverExpires}
              onChange={(event) => setNeverExpires(event.target.checked)}
              className="h-4 w-4 rounded border-neutral-300"
            />
            Never expire
          </label>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className={SECONDARY_BUTTON_CLASSES}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className={PRIMARY_BUTTON_CLASSES}
          >
            {isPending
              ? mode === "upload"
                ? "Uploading…"
                : "Saving…"
              : mode === "upload"
                ? "Upload"
                : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { StatusPill } from "@/components/documents/status-pill";
import {
  UploadDocumentDialog,
  type DocumentOwner,
} from "@/components/documents/upload-document-dialog";
import { SMALL_BUTTON_CLASSES } from "@/components/ui/form-classes";
import { formatDate } from "@/lib/utils/format";
import type { DocumentSlot } from "@/lib/utils/document-slots";
import type { DocumentVersionWithUrl } from "@/lib/queries/documents";

export function formatExpiry(version: {
  neverExpires: boolean;
  expiryDate: string | null;
} | null) {
  if (!version) return "-";
  if (version.neverExpires) return "Never expire";
  return formatDate(version.expiryDate);
}

export function DocumentRow({
  slot,
  owner,
}: {
  slot: DocumentSlot;
  owner: DocumentOwner;
}) {
  const [dialog, setDialog] = useState<"upload" | "expiry" | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [versions, setVersions] = useState<DocumentVersionWithUrl[] | null>(
    null
  );
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const { documentType, currentVersion } = slot;
  const hasFile = currentVersion !== null;

  async function toggleHistory() {
    if (historyOpen) {
      setHistoryOpen(false);
      return;
    }
    setHistoryOpen(true);
    if (!slot.documentId) return;

    // Always refetch: the signed URLs from the last open have expired.
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const response = await fetch(
        `/api/documents/${slot.documentId}/versions`
      );
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      const body = (await response.json()) as {
        versions: DocumentVersionWithUrl[];
      };
      setVersions(body.versions);
    } catch (error) {
      setHistoryError(
        error instanceof Error ? error.message : "Could not load history."
      );
    } finally {
      setHistoryLoading(false);
    }
  }

  const previousVersions = (versions ?? []).filter(
    (version) => version.id !== currentVersion?.id
  );

  return (
    <>
      <tr className="border-b border-neutral-100 last:border-0">
        <td className="px-4 py-3 align-top">
          <p className="font-medium text-neutral-900">
            {documentType.name}
            {documentType.required && (
              <span
                className="ml-1 text-red-600"
                title="Required"
                aria-label="Required"
              >
                *
              </span>
            )}
          </p>
          {slot.label && (
            <p className="mt-0.5 text-xs text-neutral-500">{slot.label}</p>
          )}
          {currentVersion && (
            <p className="mt-0.5 text-xs">
              {slot.fileUrl ? (
                <a
                  href={slot.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-600 underline decoration-neutral-300 hover:text-neutral-900"
                >
                  {currentVersion.fileName}
                </a>
              ) : (
                <span className="text-neutral-500">
                  {currentVersion.fileName}
                </span>
              )}
            </p>
          )}
        </td>
        <td className="px-4 py-3 align-top whitespace-nowrap text-neutral-600">
          {formatExpiry(currentVersion)}
        </td>
        <td className="px-4 py-3 align-top">
          <StatusPill status={slot.status} />
        </td>
        <td className="px-4 py-3 align-top">
          <div className="flex flex-wrap gap-1.5">
            {slot.fileUrl ? (
              <a
                href={slot.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={SMALL_BUTTON_CLASSES}
              >
                View
              </a>
            ) : (
              <button
                type="button"
                disabled
                className={SMALL_BUTTON_CLASSES}
                title={hasFile ? "File unavailable" : "No file uploaded"}
              >
                View
              </button>
            )}
            <button
              type="button"
              onClick={() => setDialog("upload")}
              className={SMALL_BUTTON_CLASSES}
            >
              Upload
            </button>
            <button
              type="button"
              onClick={() => setDialog("expiry")}
              disabled={!hasFile}
              className={SMALL_BUTTON_CLASSES}
            >
              Edit expiry
            </button>
            <button
              type="button"
              onClick={toggleHistory}
              disabled={!slot.documentId}
              aria-expanded={historyOpen}
              className={SMALL_BUTTON_CLASSES}
            >
              History
            </button>
          </div>
        </td>
      </tr>

      {historyOpen && (
        <tr className="border-b border-neutral-100 bg-neutral-50 last:border-0">
          <td colSpan={4} className="px-4 py-3">
            {historyLoading && (
              <p className="text-xs text-neutral-500">Loading history…</p>
            )}
            {historyError && (
              <p role="alert" className="text-xs text-red-600">
                {historyError}
              </p>
            )}
            {!historyLoading && !historyError && (
              <>
                <p className="text-xs font-medium uppercase text-neutral-500">
                  Previous versions
                </p>
                {previousVersions.length === 0 ? (
                  <p className="mt-1 text-xs text-neutral-500">
                    No previous versions.
                  </p>
                ) : (
                  <ul className="mt-1 divide-y divide-neutral-200">
                    {previousVersions.map((version) => (
                      <li
                        key={version.id}
                        className="flex flex-wrap items-center gap-x-4 gap-y-1 py-1.5 text-xs text-neutral-600"
                      >
                        <span className="font-medium text-neutral-800">
                          {version.fileName}
                        </span>
                        <span>Expiry: {formatExpiry(version)}</span>
                        <span>Uploaded {formatDate(version.uploadedAt)}</span>
                        {version.url && (
                          <a
                            href={version.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline decoration-neutral-300 hover:text-neutral-900"
                          >
                            View
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </td>
        </tr>
      )}

      {/* Portalled: a <div> can't sit inside <tbody>. */}
      {dialog &&
        createPortal(
          <UploadDocumentDialog
            mode={dialog}
            slot={slot}
            owner={owner}
            onClose={() => setDialog(null)}
          />,
          document.body
        )}
    </>
  );
}

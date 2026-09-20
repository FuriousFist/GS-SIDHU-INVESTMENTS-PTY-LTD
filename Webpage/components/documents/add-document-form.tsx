"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { createCompanyDocument } from "@/app/actions/documents";
import {
  INPUT_CLASSES,
  LABEL_CLASSES,
  PRIMARY_BUTTON_CLASSES,
  SECONDARY_BUTTON_CLASSES,
} from "@/components/ui/form-classes";
import type { DocumentTypeInfo } from "@/lib/utils/document-slots";

/**
 * "Add document" for a company tab: creates an empty slot of a chosen
 * type with a label, e.g. a second Workcover certificate for another
 * state, before any file exists.
 */
export function AddDocumentForm({
  companyId,
  types,
}: {
  companyId: string;
  types: DocumentTypeInfo[];
}) {
  const router = useRouter();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [documentTypeId, setDocumentTypeId] = useState(types[0]?.id ?? "");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={PRIMARY_BUTTON_CLASSES}
      >
        Add document
      </button>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await createCompanyDocument({
            companyId,
            documentTypeId,
            label,
          });
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setLabel("");
          setOpen(false);
          router.refresh();
        });
      }}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-neutral-200 bg-white p-4"
    >
      <div className="min-w-[220px] flex-1">
        <label htmlFor={`${id}-type`} className={LABEL_CLASSES}>
          Document type
        </label>
        <select
          id={`${id}-type`}
          value={documentTypeId}
          onChange={(event) => setDocumentTypeId(event.target.value)}
          className={INPUT_CLASSES}
        >
          {types.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-[180px]">
        <label htmlFor={`${id}-label`} className={LABEL_CLASSES}>
          Label (optional)
        </label>
        <input
          id={`${id}-label`}
          type="text"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="e.g. File for: QLD"
          className={INPUT_CLASSES}
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={isPending}
          className={SECONDARY_BUTTON_CLASSES}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending || !documentTypeId}
          className={PRIMARY_BUTTON_CLASSES}
        >
          {isPending ? "Adding…" : "Add"}
        </button>
      </div>
      {error && (
        <p role="alert" className="w-full text-sm text-red-600">
          {error}
        </p>
      )}
    </form>
  );
}

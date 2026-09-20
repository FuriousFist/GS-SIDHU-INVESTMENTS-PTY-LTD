"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { updateCompany } from "@/app/actions/documents";
import {
  INPUT_CLASSES,
  LABEL_CLASSES,
  PRIMARY_BUTTON_CLASSES,
  SECONDARY_BUTTON_CLASSES,
} from "@/components/ui/form-classes";
import type { CompanyRow } from "@/lib/queries/companies";

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

/** Company header card: read-only details with an inline "Edit" form. */
export function CompanyEditForm({ company }: { company: CompanyRow }) {
  const router = useRouter();
  const id = useId();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!editing) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">
              {company.name}
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              {company.supplier} contract &middot; Sole trader:{" "}
              {company.sole_trader ? "Yes" : "No"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={SECONDARY_BUTTON_CLASSES}
          >
            Edit
          </button>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Supplier" value={company.supplier} />
          <Field label="ABN" value={company.abn} />
          <Field label="ACN" value={company.acn} />
          <Field
            label="Notes"
            value={
              company.notes ? (
                <span className="whitespace-pre-line">{company.notes}</span>
              ) : null
            }
          />
        </dl>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await updateCompany({
            id: company.id,
            name: String(formData.get("name") ?? ""),
            soleTrader: formData.get("soleTrader") === "on",
            abn: String(formData.get("abn") ?? ""),
            acn: String(formData.get("acn") ?? ""),
            notes: String(formData.get("notes") ?? ""),
          });
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setEditing(false);
          router.refresh();
        });
      }}
      className="rounded-lg border border-neutral-200 bg-white p-4 sm:p-6"
    >
      <h1 className="text-lg font-semibold text-neutral-900">Edit company</h1>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor={`${id}-name`} className={LABEL_CLASSES}>
            Name
          </label>
          <input
            id={`${id}-name`}
            name="name"
            defaultValue={company.name}
            required
            className={INPUT_CLASSES}
          />
        </div>
        <div>
          <label htmlFor={`${id}-abn`} className={LABEL_CLASSES}>
            ABN
          </label>
          <input
            id={`${id}-abn`}
            name="abn"
            defaultValue={company.abn ?? ""}
            className={INPUT_CLASSES}
          />
        </div>
        <div>
          <label htmlFor={`${id}-acn`} className={LABEL_CLASSES}>
            ACN
          </label>
          <input
            id={`${id}-acn`}
            name="acn"
            defaultValue={company.acn ?? ""}
            className={INPUT_CLASSES}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={`${id}-notes`} className={LABEL_CLASSES}>
            Notes
          </label>
          <textarea
            id={`${id}-notes`}
            name="notes"
            rows={3}
            defaultValue={company.notes ?? ""}
            className={INPUT_CLASSES}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-neutral-700 sm:col-span-2">
          <input
            name="soleTrader"
            type="checkbox"
            defaultChecked={company.sole_trader}
            className="h-4 w-4 rounded border-neutral-300"
          />
          Sole trader
        </label>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setEditing(false)}
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
          {isPending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

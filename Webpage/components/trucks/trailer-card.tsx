"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { upsertTrailer } from "@/app/actions/documents";
import {
  INPUT_CLASSES,
  LABEL_CLASSES,
  PRIMARY_BUTTON_CLASSES,
  SECONDARY_BUTTON_CLASSES,
} from "@/components/ui/form-classes";
import { REGISTRATION_STATES } from "@/lib/utils/document-constants";
import type { TrailerRow } from "@/lib/queries/companies";

/** A tipper's trailer: rego and state, with inline edit / "Add trailer". */
export function TrailerCard({
  truckId,
  trailer,
}: {
  truckId: string;
  trailer: TrailerRow | null;
}) {
  const router = useRouter();
  const id = useId();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white p-4">
        <div className="text-sm">
          {trailer ? (
            <>
              <p className="font-medium text-neutral-900">
                Trailer {trailer.registration ?? "(no registration)"}
              </p>
              <p className="mt-0.5 text-neutral-500">
                {trailer.registration_state ?? "State not set"}
                {trailer.notes ? ` · ${trailer.notes}` : ""}
              </p>
            </>
          ) : (
            <p className="text-neutral-500">No trailer added for this tipper.</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={SECONDARY_BUTTON_CLASSES}
        >
          {trailer ? "Edit trailer" : "Add trailer"}
        </button>
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
          const result = await upsertTrailer({
            truckId,
            registration: String(formData.get("registration") ?? ""),
            registrationState: String(formData.get("registrationState") ?? ""),
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
      className="flex flex-wrap items-end gap-3 rounded-lg border border-neutral-200 bg-white p-4"
    >
      <div>
        <label htmlFor={`${id}-rego`} className={LABEL_CLASSES}>
          Trailer registration
        </label>
        <input
          id={`${id}-rego`}
          name="registration"
          defaultValue={trailer?.registration ?? ""}
          className={INPUT_CLASSES}
        />
      </div>
      <div>
        <label htmlFor={`${id}-state`} className={LABEL_CLASSES}>
          Registration state
        </label>
        <select
          id={`${id}-state`}
          name="registrationState"
          defaultValue={trailer?.registration_state ?? ""}
          className={INPUT_CLASSES}
        >
          <option value="">Not set</option>
          {REGISTRATION_STATES.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-[200px] flex-1">
        <label htmlFor={`${id}-notes`} className={LABEL_CLASSES}>
          Notes
        </label>
        <input
          id={`${id}-notes`}
          name="notes"
          defaultValue={trailer?.notes ?? ""}
          className={INPUT_CLASSES}
        />
      </div>
      <div className="flex gap-2">
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
      {error && (
        <p role="alert" className="w-full text-sm text-red-600">
          {error}
        </p>
      )}
    </form>
  );
}

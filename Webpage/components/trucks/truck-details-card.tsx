"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { updateTruckDetails } from "@/app/actions/documents";
import {
  INPUT_CLASSES,
  LABEL_CLASSES,
  PRIMARY_BUTTON_CLASSES,
  SECONDARY_BUTTON_CLASSES,
} from "@/components/ui/form-classes";
import {
  REGISTRATION_STATES,
  TRUCK_TYPES,
} from "@/lib/utils/document-constants";
import type { CompanyRow, TruckRow } from "@/lib/queries/companies";

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

function capitalise(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Truck details card with an inline edit form. */
export function TruckDetailsCard({
  truck,
  companies,
}: {
  truck: TruckRow;
  companies: Pick<CompanyRow, "id" | "name" | "supplier">[];
}) {
  const router = useRouter();
  const id = useId();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const company = companies.find((c) => c.id === truck.company_id) ?? null;

  if (!editing) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-neutral-900">
            Truck details
          </h2>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={SECONDARY_BUTTON_CLASSES}
          >
            Edit
          </button>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <Field
            label="Company"
            value={
              company ? (
                <Link
                  href={`/companies/${company.id}`}
                  className="underline decoration-neutral-300 hover:text-neutral-600"
                >
                  {company.name}
                </Link>
              ) : (
                (truck.company ?? null)
              )
            }
          />
          <Field
            label="Type"
            value={truck.truck_type ? capitalise(truck.truck_type) : null}
          />
          <Field label="Registration" value={truck.registration} />
          <Field label="Reg. state" value={truck.registration_state} />
          <Field label="Base location" value={truck.base_location} />
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
          const result = await updateTruckDetails({
            truckId: truck.id,
            companyId: String(formData.get("companyId") ?? ""),
            truckType: String(formData.get("truckType") ?? ""),
            registration: String(formData.get("registration") ?? ""),
            registrationState: String(formData.get("registrationState") ?? ""),
            baseLocation: String(formData.get("baseLocation") ?? ""),
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
      <h2 className="text-lg font-semibold text-neutral-900">
        Edit truck details
      </h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label htmlFor={`${id}-company`} className={LABEL_CLASSES}>
            Company
          </label>
          <select
            id={`${id}-company`}
            name="companyId"
            defaultValue={truck.company_id ?? ""}
            className={INPUT_CLASSES}
          >
            <option value="">No company</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.supplier})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-type`} className={LABEL_CLASSES}>
            Type
          </label>
          <select
            id={`${id}-type`}
            name="truckType"
            defaultValue={truck.truck_type ?? ""}
            className={INPUT_CLASSES}
          >
            <option value="">Not set</option>
            {TRUCK_TYPES.map((type) => (
              <option key={type} value={type}>
                {capitalise(type)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-rego`} className={LABEL_CLASSES}>
            Registration
          </label>
          <input
            id={`${id}-rego`}
            name="registration"
            defaultValue={truck.registration ?? ""}
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
            defaultValue={truck.registration_state ?? ""}
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
        <div>
          <label htmlFor={`${id}-base`} className={LABEL_CLASSES}>
            Base location
          </label>
          <input
            id={`${id}-base`}
            name="baseLocation"
            defaultValue={truck.base_location ?? ""}
            placeholder="Depot / yard"
            className={INPUT_CLASSES}
          />
        </div>
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

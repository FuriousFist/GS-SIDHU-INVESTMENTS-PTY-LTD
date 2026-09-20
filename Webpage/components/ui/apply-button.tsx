"use client";

import { useFormStatus } from "react-dom";

// Submit button for the filter forms. Must be rendered inside the <Form>
// so useFormStatus can see the pending navigation.
export function ApplyButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      className="rounded-md bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 active:scale-[0.98] active:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 disabled:cursor-progress disabled:opacity-60"
    >
      {pending ? "Applying…" : "Apply"}
    </button>
  );
}

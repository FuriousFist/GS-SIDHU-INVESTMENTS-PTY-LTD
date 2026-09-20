"use client";

import { useRouter } from "next/navigation";

export function BackLink({
  fallbackHref,
  children,
}: {
  fallbackHref: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push(fallbackHref);
        }
      }}
      className="-mx-1.5 -my-0.5 rounded-md px-1.5 py-0.5 text-sm text-neutral-500 transition-colors hover:text-neutral-800 active:scale-[0.98] active:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
    >
      {children}
    </button>
  );
}

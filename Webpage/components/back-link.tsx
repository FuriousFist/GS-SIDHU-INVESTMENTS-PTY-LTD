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
      className="text-sm text-neutral-500 hover:text-neutral-800"
    >
      {children}
    </button>
  );
}

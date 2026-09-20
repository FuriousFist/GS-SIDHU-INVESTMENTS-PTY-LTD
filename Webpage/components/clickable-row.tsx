"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

// A table row that navigates on click, with the same feedback a link
// would give: an immediate press state, a pending state while the
// destination route loads, and keyboard access (Enter/Space).
export function ClickableRow({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Awaiting push keeps the transition (and the pending style) open until
  // the navigation has been handed to the router and the new route commits.
  const navigate = () => {
    startTransition(async () => {
      await router.push(href);
    });
  };

  return (
    <tr
      role="link"
      tabIndex={0}
      aria-busy={isPending || undefined}
      onClick={navigate}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          navigate();
        }
      }}
      className={`cursor-pointer transition-colors active:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-900 ${
        isPending ? "bg-neutral-100 opacity-60 cursor-progress" : ""
      } ${className ?? ""}`}
    >
      {children}
    </tr>
  );
}

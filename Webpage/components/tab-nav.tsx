"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export type TabItem = {
  href: string;
  label: React.ReactNode;
  current: boolean;
  badge?: React.ReactNode;
  // Shown in place of the panel while this tab is loading.
  fallback: React.ReactNode;
};

/**
 * A tab bar and its panel (`children`). A tab change only changes search
 * params, so loading.tsx doesn't run and the old panel would stay on screen
 * until the server responds; instead the clicked tab's skeleton shows
 * straight away. Tabs replace the history entry so the back button leaves
 * the page rather than stepping back through tabs.
 */
export function TabNav({
  label,
  tabs,
  className = "",
  children,
}: {
  label: string;
  tabs: TabItem[];
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState<number | null>(null);
  const loading = pending && target !== null;

  return (
    <>
      <nav
        aria-label={label}
        className={`flex gap-1 border-b border-neutral-200 ${className}`}
      >
        {tabs.map((tab, i) => {
          const active = loading ? i === target : tab.current;
          return (
            <Link
              key={i}
              href={tab.href}
              replace
              aria-current={active ? "page" : undefined}
              onClick={(e) => {
                // Let the browser handle new-tab / new-window clicks.
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                e.preventDefault();
                if (active) return;
                setTarget(i);
                startTransition(() => router.replace(tab.href));
              }}
              className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium ${
                active
                  ? "border-neutral-900 text-neutral-900"
                  : "border-transparent text-neutral-500 hover:text-neutral-800"
              }`}
            >
              {tab.label}
              {tab.badge}
            </Link>
          );
        })}
      </nav>

      {loading ? (
        <div aria-busy="true">{tabs[target].fallback}</div>
      ) : (
        children
      )}
    </>
  );
}

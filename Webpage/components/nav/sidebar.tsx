"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "@/app/actions/auth";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900";

const NAV_ITEMS = [
  { href: "/", label: "Overview" },
  { href: "/dockets", label: "Dockets" },
  { href: "/trucks", label: "Trucks" },
  { href: "/companies", label: "Companies" },
  { href: "/trends", label: "Trends" },
  { href: "/turnaround", label: "Turnaround" },
  { href: "/drivers", label: "Drivers" },
];

// Fixed-size dot next to a nav label that becomes visible (and pulses)
// while that link's destination is still loading. Always rendered so the
// label doesn't shift when it toggles.
function NavPendingIndicator() {
  const { pending } = useLinkStatus();

  return (
    <span
      aria-hidden="true"
      data-pending={pending || undefined}
      className={`ml-2 inline-block h-2 w-2 rounded-full bg-current transition-opacity ${
        pending ? "animate-pulse opacity-70" : "opacity-0"
      }`}
    />
  );
}

export function Sidebar({ alertCount = 0 }: { alertCount?: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the mobile nav on route change - adjusted during render (the
  // React-recommended pattern for resetting state from a prop change)
  // rather than in an effect, which would cause an extra render pass.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  return (
    <>
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className={`-ml-2 rounded-md p-2 text-neutral-600 transition-colors hover:bg-neutral-100 active:scale-[0.98] active:bg-neutral-200 ${FOCUS_RING}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <p className="text-sm font-semibold text-neutral-900">
          GS Sidhu Investments
        </p>
        <div className="w-9" />
      </header>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 -translate-x-full flex-col border-r border-neutral-200 bg-white transition-transform duration-200 ease-in-out lg:static lg:z-auto lg:w-56 lg:translate-x-0 ${
          open ? "translate-x-0" : ""
        }`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-neutral-200 px-4 py-4">
          <div>
            <p className="text-sm font-semibold text-neutral-900">
              GS Sidhu Investments
            </p>
            <p className="text-xs text-neutral-500">Operations Dashboard</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className={`-mr-1 rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 active:scale-[0.98] active:bg-neutral-200 lg:hidden ${FOCUS_RING}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${FOCUS_RING} ${
                  isActive
                    ? "bg-neutral-900 text-white active:bg-neutral-700"
                    : "text-neutral-600 hover:bg-neutral-100 active:bg-neutral-200"
                }`}
              >
                {item.label}
                {item.href === "/companies" && alertCount > 0 && (
                  <span
                    className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-semibold leading-none text-white"
                    aria-label={`${alertCount} documents expiring or expired`}
                  >
                    {alertCount}
                  </span>
                )}
                <NavPendingIndicator />
              </Link>
            );
          })}
        </nav>

        <form action={logout} className="border-t border-neutral-200 p-2">
          <button
            type="submit"
            className={`w-full rounded-md px-3 py-2 text-left text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 active:scale-[0.98] active:bg-neutral-200 ${FOCUS_RING}`}
          >
            Log out
          </button>
        </form>
      </aside>
    </>
  );
}

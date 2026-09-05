"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";

const NAV_ITEMS = [
  { href: "/", label: "Overview" },
  { href: "/dockets", label: "Dockets" },
  { href: "/trucks", label: "Trucks" },
  { href: "/customers", label: "Customers" },
  { href: "/plants", label: "Plants" },
  { href: "/trends", label: "Trends" },
  { href: "/turnaround", label: "Turnaround" },
  { href: "/drivers", label: "Drivers" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-4 py-4">
        <p className="text-sm font-semibold text-neutral-900">
          GS Sidhu Investments
        </p>
        <p className="text-xs text-neutral-500">Operations Dashboard</p>
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
              className={`block rounded-md px-3 py-2 text-sm font-medium ${
                isActive
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <form action={logout} className="border-t border-neutral-200 p-2">
        <button
          type="submit"
          className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-neutral-600 hover:bg-neutral-100"
        >
          Log out
        </button>
      </form>
    </aside>
  );
}

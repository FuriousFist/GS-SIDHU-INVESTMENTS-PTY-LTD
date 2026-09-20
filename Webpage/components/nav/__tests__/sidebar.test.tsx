import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Sidebar } from "@/components/nav/sidebar";

const usePathname = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => usePathname(),
}));

vi.mock("@/app/actions/auth", () => ({
  logout: vi.fn(),
}));

function isOpen(container: HTMLElement) {
  // The base classes always include "lg:translate-x-0" and
  // "-translate-x-full", so check for the exact "translate-x-0" token
  // that's only appended when open, not a substring match.
  const classes = container.querySelector("aside")!.className.split(/\s+/);
  return classes.includes("translate-x-0");
}

describe("Sidebar", () => {
  test("mobile nav opens and closes via its own buttons", async () => {
    usePathname.mockReturnValue("/");
    const user = userEvent.setup();

    const { container } = render(<Sidebar />);

    expect(isOpen(container)).toBe(false);

    await user.click(screen.getByLabelText("Open menu"));
    expect(isOpen(container)).toBe(true);

    await user.click(screen.getByLabelText("Close menu"));
    expect(isOpen(container)).toBe(false);
  });

  test("navigating to a new route closes the mobile nav", async () => {
    usePathname.mockReturnValue("/");
    const user = userEvent.setup();

    const { container, rerender } = render(<Sidebar />);

    await user.click(screen.getByLabelText("Open menu"));
    expect(isOpen(container)).toBe(true);

    usePathname.mockReturnValue("/dockets");
    rerender(<Sidebar />);

    expect(isOpen(container)).toBe(false);
  });

  test("highlights the active nav item, exact-matching the overview link", () => {
    usePathname.mockReturnValue("/dockets/123");

    render(<Sidebar />);

    expect(screen.getByRole("link", { name: "Dockets" })).toHaveClass(
      "bg-neutral-900"
    );
    expect(screen.getByRole("link", { name: "Overview" })).not.toHaveClass(
      "bg-neutral-900"
    );
  });

  test("does not render the removed Customers and Plants tabs", () => {
    usePathname.mockReturnValue("/");

    render(<Sidebar />);

    expect(
      screen.queryByRole("link", { name: "Customers" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Plants" })
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole("link").map((l) => l.getAttribute("href"))).toEqual(
      ["/", "/dockets", "/trucks", "/trends", "/turnaround", "/drivers"]
    );
  });

  test("each nav link carries a hidden pending indicator and press styles", () => {
    usePathname.mockReturnValue("/");

    render(<Sidebar />);

    const link = screen.getByRole("link", { name: "Dockets" });
    expect(link).toHaveClass("active:bg-neutral-200", "transition-colors");

    // The indicator is always rendered (fixed size, opacity toggled) so the
    // label doesn't shift when a navigation becomes pending.
    const dot = link.querySelector("[aria-hidden='true']");
    expect(dot).not.toBeNull();
    expect(dot).toHaveClass("opacity-0");
    expect(dot).not.toHaveAttribute("data-pending");
  });
});

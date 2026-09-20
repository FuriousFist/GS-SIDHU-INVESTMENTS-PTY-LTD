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
});

describe("Sidebar companies link and alert badge", () => {
  test("includes a Companies link after Trucks", () => {
    usePathname.mockReturnValue("/");

    render(<Sidebar />);

    const labels = screen
      .getAllByRole("link")
      .map((link) => link.textContent?.trim());
    expect(labels.indexOf("Companies")).toBe(labels.indexOf("Trucks") + 1);
    expect(screen.getByRole("link", { name: "Companies" })).toHaveAttribute(
      "href",
      "/companies"
    );
  });

  test("shows a red badge only when alertCount > 0", () => {
    usePathname.mockReturnValue("/");

    const { rerender } = render(<Sidebar alertCount={0} />);
    expect(
      screen.queryByLabelText(/documents expiring or expired/)
    ).not.toBeInTheDocument();

    rerender(<Sidebar alertCount={3} />);
    const badge = screen.getByLabelText("3 documents expiring or expired");
    expect(badge).toHaveTextContent("3");
    expect(badge).toHaveClass("bg-red-600", "text-white");
    expect(screen.getByRole("link", { name: /Companies/ })).toContainElement(
      badge
    );
  });
});

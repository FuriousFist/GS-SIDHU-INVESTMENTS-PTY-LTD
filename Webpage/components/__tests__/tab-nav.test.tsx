import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TabNav } from "@/components/tab-nav";

// Never resolves, so the navigation transition stays pending.
const replace = vi.fn(() => new Promise(() => {}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

function renderTabs() {
  render(
    <TabNav
      label="Sections"
      tabs={[
        { href: "/x?tab=a", label: "A", current: true, fallback: "A loading" },
        { href: "/x?tab=b", label: "B", current: false, fallback: "B loading" },
      ]}
    >
      A content
    </TabNav>
  );
}

describe("TabNav", () => {
  beforeEach(() => {
    replace.mockClear();
  });

  test("clicking another tab replaces the URL and shows its fallback", async () => {
    renderTabs();
    await userEvent.click(screen.getByRole("link", { name: "B" }));

    expect(replace).toHaveBeenCalledWith("/x?tab=b");
    expect(screen.getByText("B loading")).toBeInTheDocument();
    expect(screen.queryByText("A content")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "B" })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  test("clicking the current tab does nothing", async () => {
    renderTabs();
    await userEvent.click(screen.getByRole("link", { name: "A" }));

    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByText("A content")).toBeInTheDocument();
  });
});

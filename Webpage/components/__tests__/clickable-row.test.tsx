import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClickableRow } from "@/components/clickable-row";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

function renderRow(className?: string) {
  render(
    <table>
      <tbody>
        <ClickableRow href="/dockets/123" className={className}>
          <td>Row content</td>
        </ClickableRow>
      </tbody>
    </table>
  );
  return screen.getByText("Row content").closest("tr")!;
}

describe("ClickableRow", () => {
  beforeEach(() => {
    push.mockReset();
  });

  test("clicking the row navigates to href", async () => {
    const user = userEvent.setup();
    renderRow();

    await user.click(screen.getByText("Row content"));

    expect(push).toHaveBeenCalledWith("/dockets/123");
  });

  test("applies the cursor-pointer class alongside any custom className", () => {
    const row = renderRow("highlight");

    expect(row).toHaveClass("cursor-pointer", "highlight");
  });

  test("shows a pending state and aria-busy while the navigation is in flight", async () => {
    // Never resolves, so the transition stays pending for the assertion.
    push.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    const row = renderRow();

    expect(row).not.toHaveAttribute("aria-busy");
    expect(row).not.toHaveClass("opacity-60");

    await user.click(row);

    await waitFor(() => {
      expect(row).toHaveAttribute("aria-busy", "true");
    });
    expect(row).toHaveClass("bg-neutral-100", "opacity-60", "cursor-progress");
  });

  test("is keyboard accessible: focusable link role, Enter and Space navigate", async () => {
    const user = userEvent.setup();
    const row = renderRow();

    expect(row).toHaveAttribute("role", "link");
    expect(row).toHaveAttribute("tabindex", "0");

    row.focus();
    await user.keyboard("{Enter}");
    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/dockets/123");

    await user.keyboard(" ");
    expect(push).toHaveBeenCalledTimes(2);
  });

  test("other keys do not navigate", async () => {
    const user = userEvent.setup();
    const row = renderRow();

    row.focus();
    await user.keyboard("{Tab}");
    await user.keyboard("a");

    expect(push).not.toHaveBeenCalled();
  });
});

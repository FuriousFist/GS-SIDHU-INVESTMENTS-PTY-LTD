import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClickableRow } from "@/components/clickable-row";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

describe("ClickableRow", () => {
  test("clicking the row navigates to href", async () => {
    push.mockClear();
    const user = userEvent.setup();

    render(
      <table>
        <tbody>
          <ClickableRow href="/dockets/123">
            <td>Row content</td>
          </ClickableRow>
        </tbody>
      </table>
    );

    await user.click(screen.getByText("Row content"));

    expect(push).toHaveBeenCalledWith("/dockets/123");
  });

  test("applies the cursor-pointer class alongside any custom className", () => {
    render(
      <table>
        <tbody>
          <ClickableRow href="/dockets/123" className="highlight">
            <td>Row</td>
          </ClickableRow>
        </tbody>
      </table>
    );

    expect(screen.getByText("Row").closest("tr")).toHaveClass(
      "cursor-pointer",
      "highlight"
    );
  });
});

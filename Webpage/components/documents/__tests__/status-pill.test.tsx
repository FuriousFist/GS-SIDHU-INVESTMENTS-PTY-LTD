import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusPill } from "@/components/documents/status-pill";

describe("StatusPill", () => {
  test.each([
    ["verified", "Verified", "bg-green-100", "text-green-800"],
    ["expiring", "Expiring", "bg-amber-100", "text-amber-800"],
    ["expired", "Expired", "bg-red-100", "text-red-800"],
    ["missing", "Missing", "bg-neutral-200", "text-neutral-700"],
  ] as const)("%s renders its label and colours", (status, label, bg, fg) => {
    render(<StatusPill status={status} />);

    const pill = screen.getByText(label);
    expect(pill).toHaveClass(bg, fg, "uppercase");
  });
});

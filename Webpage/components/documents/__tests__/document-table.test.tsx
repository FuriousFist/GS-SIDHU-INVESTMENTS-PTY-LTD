import { describe, expect, test, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { DocumentTable } from "@/components/documents/document-table";
import { buildDocumentSlots } from "@/lib/utils/document-slots";
import type {
  DocumentTypeInfo,
  DocumentVersionInfo,
} from "@/lib/utils/document-slots";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const TODAY = new Date("2026-09-15T12:00:00Z");
const OWNER = { scope: "truck" as const, ownerId: "truck-1" };

function type(
  id: string,
  overrides: Partial<DocumentTypeInfo> = {}
): DocumentTypeInfo {
  return {
    id,
    code: id,
    name: `Type ${id}`,
    scope: "truck",
    category: null,
    supplier: "Holcim",
    required: false,
    defaultNeverExpires: false,
    sortOrder: 0,
    ...overrides,
  };
}

function version(
  expiryDate: string | null,
  neverExpires = false
): DocumentVersionInfo {
  return {
    id: `v-${expiryDate ?? "never"}`,
    storagePath: "truck/truck-1/doc/file.pdf",
    fileName: "file.pdf",
    mimeType: "application/pdf",
    sizeBytes: 10,
    expiryDate,
    neverExpires,
    uploadedAt: "2026-09-01T00:00:00Z",
  };
}

describe("DocumentTable", () => {
  test("empty slot list shows a message instead of a table", () => {
    render(<DocumentTable slots={[]} owner={OWNER} />);

    expect(screen.getByText("No documents are required here.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  test("rows keep the expired → expiring → missing → verified order", () => {
    const slots = buildDocumentSlots(
      [
        type("a", { name: "Verified doc", sortOrder: 1 }),
        type("b", { name: "Expired doc", sortOrder: 2 }),
        type("c", { name: "Missing doc", sortOrder: 3 }),
        type("d", { name: "Expiring doc", sortOrder: 4 }),
      ],
      [
        { id: "da", document_type_id: "a", label: null, currentVersion: version("2030-01-01"), fileUrl: "https://signed/a" },
        { id: "db", document_type_id: "b", label: null, currentVersion: version("2026-09-01"), fileUrl: "https://signed/b" },
        { id: "dd", document_type_id: "d", label: null, currentVersion: version("2026-09-20"), fileUrl: "https://signed/d" },
      ],
      TODAY
    );

    render(<DocumentTable slots={slots} owner={OWNER} />);

    const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1);
    const names = rows.map(
      (row) => within(row).getAllByRole("cell")[0].querySelector("p")!.textContent
    );
    expect(names).toEqual([
      "Expired doc",
      "Expiring doc",
      "Missing doc",
      "Verified doc",
    ]);
  });

  test("marks required types with a red asterisk", () => {
    const slots = buildDocumentSlots(
      [type("rego", { name: "Registration", required: true }), type("photos", { name: "Photos" })],
      [],
      TODAY
    );

    render(<DocumentTable slots={slots} owner={OWNER} />);

    const marker = screen.getByLabelText("Required");
    expect(marker).toHaveClass("text-red-600");
    expect(marker.closest("p")).toHaveTextContent("Registration");
    expect(screen.getAllByLabelText("Required")).toHaveLength(1);
  });

  test("never-expiring documents say Never expire", () => {
    const slots = buildDocumentSlots(
      [type("abn", { name: "ABN" })],
      [{ id: "d1", document_type_id: "abn", label: null, currentVersion: version(null, true) }],
      TODAY
    );

    render(<DocumentTable slots={slots} owner={OWNER} />);

    expect(screen.getByText("Never expire")).toBeInTheDocument();
  });

  test("View is disabled when the document is missing", () => {
    const slots = buildDocumentSlots(
      [type("a", { name: "Present" }), type("b", { name: "Absent" })],
      [{ id: "d1", document_type_id: "a", label: null, currentVersion: version("2030-01-01"), fileUrl: "https://signed/a" }],
      TODAY
    );

    render(<DocumentTable slots={slots} owner={OWNER} />);

    const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1);
    const absentRow = rows.find((row) => within(row).queryByText("Absent"))!;
    const presentRow = rows.find((row) => within(row).queryByText("Present"))!;

    expect(within(absentRow).getByRole("button", { name: "View" })).toBeDisabled();
    expect(within(absentRow).getByRole("button", { name: "Edit expiry" })).toBeDisabled();
    expect(within(absentRow).getByRole("button", { name: "History" })).toBeDisabled();
    expect(within(absentRow).getByRole("button", { name: "Upload" })).toBeEnabled();

    expect(within(presentRow).getByRole("link", { name: "View" })).toHaveAttribute(
      "href",
      "https://signed/a"
    );
  });

  test("shows the label under the document name", () => {
    const slots = buildDocumentSlots(
      [type("wc", { name: "Workcover", scope: "company", category: "insurance" })],
      [{ id: "d1", document_type_id: "wc", label: "File for: QLD", currentVersion: null }],
      TODAY
    );

    render(<DocumentTable slots={slots} owner={{ scope: "company", ownerId: "c1" }} />);

    expect(screen.getByText("File for: QLD")).toBeInTheDocument();
  });
});

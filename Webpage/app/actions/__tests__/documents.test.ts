import { beforeEach, describe, expect, test, vi } from "vitest";
import { makeQueryBuilder, makeSupabaseMock } from "@/test/supabase-mock";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  createCompanyDocument,
  updateCompany,
  updateDocumentExpiry,
  updateTruckDetails,
  uploadDocumentVersion,
  upsertTrailer,
} from "@/app/actions/documents";

const USER = { id: "11111111-1111-4111-8111-111111111111" };
const DOC_ID = "22222222-2222-4222-8222-222222222222";
const TYPE_ID = "33333333-3333-4333-8333-333333333333";
const TRUCK_ID = "44444444-4444-4444-8444-444444444444";
const COMPANY_ID = "55555555-5555-4555-8555-555555555555";
const VERSION_ID = "66666666-6666-4666-8666-666666666666";

function formDataWith(fields: Record<string, string | File>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  return formData;
}

function pdf(name = "cert.pdf", size = 1024) {
  return new File([new Uint8Array(size)], name, { type: "application/pdf" });
}

function setup(user: { id: string } | null = USER) {
  const supabase = makeSupabaseMock() as ReturnType<typeof makeSupabaseMock> & {
    auth: { getUser: ReturnType<typeof vi.fn> };
  };
  supabase.auth.getUser = vi.fn().mockResolvedValue({ data: { user } });
  vi.mocked(createClient).mockResolvedValue(supabase as never);
  return supabase;
}

beforeEach(() => {
  vi.mocked(revalidatePath).mockClear();
});

describe("uploadDocumentVersion", () => {
  test("rejects when not logged in", async () => {
    setup(null);

    const result = await uploadDocumentVersion(
      formDataWith({ documentId: DOC_ID, file: pdf(), expiryDate: "2030-01-01" })
    );

    expect(result).toEqual({ ok: false, error: "You must be logged in." });
  });

  test("rejects a missing file", async () => {
    const supabase = setup();

    const result = await uploadDocumentVersion(
      formDataWith({ documentId: DOC_ID, expiryDate: "2030-01-01" })
    );

    expect(result).toEqual({ ok: false, error: "Choose a file to upload." });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  test("rejects files over 10 MB", async () => {
    setup();

    const result = await uploadDocumentVersion(
      formDataWith({
        documentId: DOC_ID,
        file: pdf("big.pdf", 10 * 1024 * 1024 + 1),
        expiryDate: "2030-01-01",
      })
    );

    expect(result).toEqual({ ok: false, error: "File must be 10 MB or smaller." });
  });

  test("rejects a missing expiry when not never-expires", async () => {
    const supabase = setup();

    const result = await uploadDocumentVersion(
      formDataWith({ documentId: DOC_ID, file: pdf() })
    );

    expect(result).toEqual({
      ok: false,
      error: "Enter an expiry date or tick Never expire.",
    });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  test("rejects a malformed expiry date", async () => {
    setup();

    const result = await uploadDocumentVersion(
      formDataWith({ documentId: DOC_ID, file: pdf(), expiryDate: "31/12/2030" })
    );

    expect(result).toEqual({ ok: false, error: "Expiry date must be YYYY-MM-DD." });
  });

  test("uploads a new version of an existing document, keeping the old one", async () => {
    const supabase = setup();
    const upload = vi.fn().mockResolvedValue({ error: null });
    supabase.storage.from.mockReturnValue({ upload });

    const documentsUpdate = makeQueryBuilder({ error: null });
    supabase.from
      // documents lookup
      .mockReturnValueOnce(
        makeQueryBuilder({
          data: { id: DOC_ID, company_id: null, truck_id: TRUCK_ID, trailer_id: null },
          error: null,
        })
      )
      // document_versions insert
      .mockReturnValueOnce(makeQueryBuilder({ data: { id: VERSION_ID }, error: null }))
      // documents update (pointer)
      .mockReturnValueOnce(documentsUpdate);

    const result = await uploadDocumentVersion(
      formDataWith({ documentId: DOC_ID, file: pdf("My Cert (2026).pdf"), expiryDate: "2030-01-01" })
    );

    expect(result).toEqual({ ok: true });

    expect(supabase.storage.from).toHaveBeenCalledWith("compliance-documents");
    const [path, , options] = upload.mock.calls[0];
    expect(path).toMatch(
      new RegExp(`^truck/${TRUCK_ID}/${DOC_ID}/\\d+-My_Cert_2026_.pdf$`)
    );
    expect(options).toEqual({ contentType: "application/pdf", upsert: false });

    const versionsBuilder = supabase.from.mock.results[1].value;
    expect(supabase.from.mock.calls[1][0]).toBe("document_versions");
    expect(versionsBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        document_id: DOC_ID,
        storage_path: path,
        file_name: "My Cert (2026).pdf",
        mime_type: "application/pdf",
        size_bytes: 1024,
        expiry_date: "2030-01-01",
        never_expires: false,
        uploaded_by: USER.id,
      })
    );

    expect(supabase.from.mock.calls[2][0]).toBe("documents");
    expect(documentsUpdate.update).toHaveBeenCalledWith({
      current_version_id: VERSION_ID,
    });
    expect(documentsUpdate.eq).toHaveBeenCalledWith("id", DOC_ID);

    // Nothing is ever deleted - no delete on any builder, no storage remove.
    for (const { value } of supabase.from.mock.results) {
      expect(value.delete).not.toHaveBeenCalled();
    }
    expect(revalidatePath).toHaveBeenCalledWith(`/trucks/${TRUCK_ID}`);
  });

  test("lazily creates the documents row on first upload to a slot", async () => {
    const supabase = setup();
    supabase.storage.from.mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
    });

    const existingLookup = makeQueryBuilder({ data: [], error: null });
    const insertDocument = makeQueryBuilder({
      data: { id: DOC_ID, company_id: null, truck_id: TRUCK_ID, trailer_id: null },
      error: null,
    });
    supabase.from
      .mockReturnValueOnce(existingLookup)
      .mockReturnValueOnce(insertDocument)
      .mockReturnValueOnce(makeQueryBuilder({ data: { id: VERSION_ID }, error: null }))
      .mockReturnValueOnce(makeQueryBuilder({ error: null }));

    const result = await uploadDocumentVersion(
      formDataWith({
        documentTypeId: TYPE_ID,
        truckId: TRUCK_ID,
        file: pdf(),
        neverExpires: "on",
      })
    );

    expect(result).toEqual({ ok: true });
    expect(existingLookup.eq).toHaveBeenCalledWith("document_type_id", TYPE_ID);
    expect(existingLookup.eq).toHaveBeenCalledWith("truck_id", TRUCK_ID);
    expect(existingLookup.is).toHaveBeenCalledWith("label", null);
    expect(insertDocument.insert).toHaveBeenCalledWith({
      document_type_id: TYPE_ID,
      company_id: null,
      truck_id: TRUCK_ID,
      trailer_id: null,
      label: null,
    });

    const versionsBuilder = supabase.from.mock.results[2].value;
    expect(versionsBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ expiry_date: null, never_expires: true })
    );
  });

  test("reuses an existing row for the same type, owner and label", async () => {
    const supabase = setup();
    supabase.storage.from.mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
    });

    supabase.from
      .mockReturnValueOnce(
        makeQueryBuilder({
          data: [{ id: DOC_ID, company_id: COMPANY_ID, truck_id: null, trailer_id: null }],
          error: null,
        })
      )
      .mockReturnValueOnce(makeQueryBuilder({ data: { id: VERSION_ID }, error: null }))
      .mockReturnValueOnce(makeQueryBuilder({ error: null }));

    const result = await uploadDocumentVersion(
      formDataWith({
        documentTypeId: TYPE_ID,
        companyId: COMPANY_ID,
        label: "QLD",
        file: pdf(),
        expiryDate: "2030-01-01",
      })
    );

    expect(result).toEqual({ ok: true });
    expect(supabase.from.mock.results[0].value.eq).toHaveBeenCalledWith("label", "QLD");
    // No insert into documents happened - straight to versions.
    expect(supabase.from.mock.calls.map((c) => c[0])).toEqual([
      "documents",
      "document_versions",
      "documents",
    ]);
  });

  test("requires exactly one owner when creating a document", async () => {
    setup();

    const result = await uploadDocumentVersion(
      formDataWith({
        documentTypeId: TYPE_ID,
        companyId: COMPANY_ID,
        truckId: TRUCK_ID,
        file: pdf(),
        expiryDate: "2030-01-01",
      })
    );

    expect(result).toEqual({
      ok: false,
      error: "A document must belong to exactly one company, truck or trailer.",
    });
  });

  test("surfaces storage upload failures", async () => {
    const supabase = setup();
    supabase.storage.from.mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: { message: "bucket missing" } }),
    });
    supabase.from.mockReturnValueOnce(
      makeQueryBuilder({
        data: { id: DOC_ID, company_id: COMPANY_ID, truck_id: null, trailer_id: null },
        error: null,
      })
    );

    const result = await uploadDocumentVersion(
      formDataWith({ documentId: DOC_ID, file: pdf(), expiryDate: "2030-01-01" })
    );

    expect(result).toEqual({ ok: false, error: "Upload failed: bucket missing" });
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });
});

describe("updateDocumentExpiry", () => {
  test("updates the current version in place", async () => {
    const supabase = setup();
    const versionUpdate = makeQueryBuilder({ error: null });
    supabase.from
      .mockReturnValueOnce(
        makeQueryBuilder({
          data: {
            id: DOC_ID,
            company_id: COMPANY_ID,
            truck_id: null,
            trailer_id: null,
            current_version_id: VERSION_ID,
          },
          error: null,
        })
      )
      .mockReturnValueOnce(versionUpdate);

    const result = await updateDocumentExpiry({
      documentId: DOC_ID,
      expiryDate: "2031-06-30",
    });

    expect(result).toEqual({ ok: true });
    expect(versionUpdate.update).toHaveBeenCalledWith({
      expiry_date: "2031-06-30",
      never_expires: false,
    });
    expect(versionUpdate.eq).toHaveBeenCalledWith("id", VERSION_ID);
    expect(revalidatePath).toHaveBeenCalledWith(`/companies/${COMPANY_ID}`);
  });

  test("rejects when the document has no version yet", async () => {
    const supabase = setup();
    supabase.from.mockReturnValueOnce(
      makeQueryBuilder({
        data: {
          id: DOC_ID,
          company_id: COMPANY_ID,
          truck_id: null,
          trailer_id: null,
          current_version_id: null,
        },
        error: null,
      })
    );

    const result = await updateDocumentExpiry({ documentId: DOC_ID, neverExpires: true });

    expect(result).toEqual({
      ok: false,
      error: "Upload a file before setting an expiry date.",
    });
  });

  test("rejects a missing expiry when not never-expires", async () => {
    const supabase = setup();

    const result = await updateDocumentExpiry({ documentId: DOC_ID });

    expect(result).toEqual({
      ok: false,
      error: "Enter an expiry date or tick Never expire.",
    });
    expect(supabase.from).not.toHaveBeenCalled();
  });
});

describe("createCompanyDocument", () => {
  test("inserts an empty slot with a label", async () => {
    const supabase = setup();
    const insert = makeQueryBuilder({ error: null });
    supabase.from.mockReturnValueOnce(insert);

    const result = await createCompanyDocument({
      companyId: COMPANY_ID,
      documentTypeId: TYPE_ID,
      label: "  File for: VIC  ",
    });

    expect(result).toEqual({ ok: true });
    expect(insert.insert).toHaveBeenCalledWith({
      company_id: COMPANY_ID,
      document_type_id: TYPE_ID,
      label: "File for: VIC",
    });
  });

  test("rejects an invalid type id", async () => {
    setup();

    expect(
      await createCompanyDocument({ companyId: COMPANY_ID, documentTypeId: "nope" })
    ).toEqual({ ok: false, error: "Choose a document type." });
  });
});

describe("updateCompany", () => {
  test("requires a name", async () => {
    setup();

    expect(
      await updateCompany({ id: COMPANY_ID, name: "   ", soleTrader: false })
    ).toEqual({ ok: false, error: "Company name is required." });
  });

  test("updates the company fields", async () => {
    const supabase = setup();
    const update = makeQueryBuilder({ error: null });
    supabase.from.mockReturnValueOnce(update);

    const result = await updateCompany({
      id: COMPANY_ID,
      name: "GS Sidhu Investments Pty Ltd",
      soleTrader: true,
      abn: "12 345 678 901",
      acn: "",
      notes: null,
    });

    expect(result).toEqual({ ok: true });
    expect(update.update).toHaveBeenCalledWith({
      name: "GS Sidhu Investments Pty Ltd",
      sole_trader: true,
      abn: "12 345 678 901",
      acn: null,
      notes: null,
    });
    expect(update.eq).toHaveBeenCalledWith("id", COMPANY_ID);
  });
});

describe("updateTruckDetails", () => {
  test("rejects an unknown truck type or state", async () => {
    setup();

    expect(
      await updateTruckDetails({ truckId: TRUCK_ID, truckType: "bus" })
    ).toEqual({ ok: false, error: "Type must be agitator or tipper." });
    expect(
      await updateTruckDetails({ truckId: TRUCK_ID, registrationState: "XX" })
    ).toEqual({
      ok: false,
      error: "Registration state must be an Australian state or territory.",
    });
  });

  test("keeps trucks.company in step with the linked company's supplier", async () => {
    const supabase = setup();
    const update = makeQueryBuilder({ error: null });
    supabase.from
      .mockReturnValueOnce(makeQueryBuilder({ data: { supplier: "Barro" }, error: null }))
      .mockReturnValueOnce(update);

    const result = await updateTruckDetails({
      truckId: TRUCK_ID,
      companyId: COMPANY_ID,
      truckType: "tipper",
      registration: "ABC123",
      registrationState: "VIC",
      baseLocation: "Epping yard",
    });

    expect(result).toEqual({ ok: true });
    expect(update.update).toHaveBeenCalledWith({
      company_id: COMPANY_ID,
      company: "Barro",
      truck_type: "tipper",
      registration: "ABC123",
      registration_state: "VIC",
      base_location: "Epping yard",
    });
  });

  test("clearing the company leaves the legacy text alone", async () => {
    const supabase = setup();
    const update = makeQueryBuilder({ error: null });
    supabase.from.mockReturnValueOnce(update);

    await updateTruckDetails({ truckId: TRUCK_ID, companyId: "" });

    expect(update.update).toHaveBeenCalledWith(
      expect.not.objectContaining({ company: expect.anything() })
    );
    expect(update.update).toHaveBeenCalledWith(
      expect.objectContaining({ company_id: null })
    );
  });
});

describe("upsertTrailer", () => {
  test("rejects non-tippers", async () => {
    const supabase = setup();
    supabase.from.mockReturnValueOnce(
      makeQueryBuilder({
        data: { id: TRUCK_ID, truck_type: "agitator", company_id: null },
        error: null,
      })
    );

    const result = await upsertTrailer({ truckId: TRUCK_ID, registration: "TRL1" });

    expect(result).toEqual({ ok: false, error: "Only tippers have a trailer." });
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });

  test("upserts the tipper's trailer keyed by truck_id", async () => {
    const supabase = setup();
    const upsert = makeQueryBuilder({ error: null });
    supabase.from
      .mockReturnValueOnce(
        makeQueryBuilder({
          data: { id: TRUCK_ID, truck_type: "tipper", company_id: COMPANY_ID },
          error: null,
        })
      )
      .mockReturnValueOnce(upsert);

    const result = await upsertTrailer({
      truckId: TRUCK_ID,
      registration: "TRL1",
      registrationState: "QLD",
      notes: "",
    });

    expect(result).toEqual({ ok: true });
    expect(upsert.upsert).toHaveBeenCalledWith(
      { truck_id: TRUCK_ID, registration: "TRL1", registration_state: "QLD", notes: null },
      { onConflict: "truck_id" }
    );
    expect(revalidatePath).toHaveBeenCalledWith(`/trucks/${TRUCK_ID}`);
    expect(revalidatePath).toHaveBeenCalledWith(`/companies/${COMPANY_ID}`);
  });
});

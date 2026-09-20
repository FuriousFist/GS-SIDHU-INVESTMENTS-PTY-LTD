import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDocumentVersions } from "@/lib/queries/documents";

/**
 * Version history for a document with freshly signed URLs. Fetched on
 * demand from the History control, since signed URLs only last 60 s.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { documentId } = await params;

  try {
    const versions = await getDocumentVersions(documentId);
    return NextResponse.json({ versions });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/nav/sidebar";
import { getComplianceAlertCount } from "@/lib/queries/documents";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The proxy already redirects unauthenticated requests, but every
  // protected Server Component tree re-checks here too - defense in depth,
  // per Next.js's own guidance not to rely on the proxy/middleware alone.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Badge on the Companies tab. A failure here (e.g. the documents
  // migration not yet applied) must not take the whole dashboard down.
  const alertCount = await getComplianceAlertCount().catch(() => 0);

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar alertCount={alertCount} />
      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-neutral-50 p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}

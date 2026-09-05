import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/nav/sidebar";

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

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-neutral-50 p-8">
        {children}
      </main>
    </div>
  );
}

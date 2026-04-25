import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getPaidEmailFromCookieReader } from "@/lib/paywall";
import { listMonitoredContent, listScanResultsByOwner } from "@/lib/database";
import { DashboardClientShell } from "@/components/dashboard-client-shell";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const paidEmail = getPaidEmailFromCookieReader(cookieStore);

  if (!paidEmail) {
    redirect("/");
  }

  const [content, results] = await Promise.all([
    listMonitoredContent(paidEmail),
    listScanResultsByOwner(paidEmail)
  ]);

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-5 pb-20 pt-8 sm:px-8 lg:px-10">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-blue-200">Paid Workspace</p>
          <h1 className="text-2xl font-semibold text-white">Monitoring Dashboard</h1>
          <p className="text-sm text-slate-300">Signed in with purchase email: {paidEmail}</p>
        </div>
        <a
          href="/api/auth/logout"
          className="rounded-md border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500"
        >
          Sign Out
        </a>
      </header>

      <DashboardClientShell initialContent={content} initialResults={results} />
    </main>
  );
}

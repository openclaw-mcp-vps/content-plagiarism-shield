import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowRight, ShieldAlert, SearchCheck, MailCheck, CheckCircle2 } from "lucide-react";
import { getPaidEmailFromCookieReader } from "@/lib/paywall";
import { UnlockAccessForm } from "@/components/unlock-access-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Monitor Your Content for Unauthorized Republishing",
  description:
    "Content Plagiarism Shield finds copied blog posts, flags likely infringement, and helps you send DMCA notices before stolen pages outrank your originals."
};

const faqs = [
  {
    question: "How does detection work?",
    answer:
      "Each monitored URL is parsed into normalized text, then searched using quoted snippets and title queries. Candidate pages are downloaded and scored with shingle-based similarity to detect likely republication."
  },
  {
    question: "Will this send legal notices automatically?",
    answer:
      "You stay in control. The app drafts a DMCA notice with required statements and can send it to a likely abuse mailbox for the infringing domain after your review."
  },
  {
    question: "How quickly will I know when content is copied?",
    answer:
      "Scans can run on demand from the dashboard and can also run from a background cron job. When new matches appear, the system emails an alert if SMTP is configured."
  },
  {
    question: "Who should use this?",
    answer:
      "Independent creators, SEO agencies, and SaaS marketing teams with high-value blog libraries that lose traffic and lead attribution when content is scraped."
  }
];

export default async function LandingPage() {
  const cookieStore = await cookies();
  const paidEmail = getPaidEmailFromCookieReader(cookieStore);
  const stripeLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK ?? "";

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-18 px-5 pb-20 pt-8 sm:px-8 lg:px-10">
      <header className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-blue-300">Content Plagiarism Shield</p>
          <p className="text-sm text-slate-400">Monitor your content for unauthorized republishing</p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-blue-500"
        >
          Dashboard <ArrowRight className="h-4 w-4" />
        </Link>
      </header>

      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-blue-700/60 bg-blue-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-blue-200">
            Revenue Protection for Content Teams
          </p>
          <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">
            Catch stolen posts before they siphon your search traffic.
          </h1>
          <p className="max-w-2xl text-lg text-slate-300">
            Monitor your articles, run continuous plagiarism scans, and send DMCA takedown notices from one dashboard. Stop unauthorized republishing from outranking your original work.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <a href={stripeLink}>
                Start for $15/month <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/dashboard">Open Dashboard</Link>
            </Button>
          </div>
          <p className="text-sm text-slate-400">
            Buy button opens Stripe-hosted checkout directly. After payment, unlock access with the same email.
          </p>
        </div>

        <Card className="rounded-2xl p-6">
          <h2 className="mb-3 text-lg font-semibold text-white">Access Status</h2>
          <p className="mb-4 text-sm text-slate-300">
            {paidEmail
              ? `Dashboard access is active for ${paidEmail}.`
              : "Your monitoring dashboard is paywalled until purchase is confirmed."}
          </p>
          {paidEmail ? (
            <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-500">
              <Link href="/dashboard">Continue to Dashboard</Link>
            </Button>
          ) : (
            <UnlockAccessForm />
          )}
        </Card>
      </section>

      <section id="problem" className="space-y-5">
        <h2 className="text-2xl font-semibold text-white">The Problem</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <ShieldAlert className="mb-3 h-5 w-5 text-red-300" />
            <h3 className="mb-2 text-lg font-medium">Silent Content Theft</h3>
            <p className="text-sm text-slate-300">
              Scraper sites and low-quality publishers copy your posts verbatim, capture long-tail traffic, and dilute your authority.
            </p>
          </article>
          <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <SearchCheck className="mb-3 h-5 w-5 text-blue-300" />
            <h3 className="mb-2 text-lg font-medium">SEO Attribution Loss</h3>
            <p className="text-sm text-slate-300">
              Duplicate pages can index quickly and outrank the source, stealing clicks that should convert on your site.
            </p>
          </article>
          <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <MailCheck className="mb-3 h-5 w-5 text-emerald-300" />
            <h3 className="mb-2 text-lg font-medium">Manual Enforcement Is Slow</h3>
            <p className="text-sm text-slate-300">
              Drafting legally complete notices and finding abuse contacts manually can take hours per incident.
            </p>
          </article>
        </div>
      </section>

      <section id="solution" className="space-y-5">
        <h2 className="text-2xl font-semibold text-white">How It Works</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
            <p className="mb-2 font-mono text-xs uppercase tracking-widest text-blue-200">Step 1</p>
            <h3 className="mb-2 text-lg font-medium">Add Your URLs</h3>
            <p className="text-sm text-slate-300">Track blog posts, landing pages, and resource articles that drive revenue.</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
            <p className="mb-2 font-mono text-xs uppercase tracking-widest text-blue-200">Step 2</p>
            <h3 className="mb-2 text-lg font-medium">Run Automated Scans</h3>
            <p className="text-sm text-slate-300">Search-engine crawling and similarity scoring identify likely unauthorized republishes.</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
            <p className="mb-2 font-mono text-xs uppercase tracking-widest text-blue-200">Step 3</p>
            <h3 className="mb-2 text-lg font-medium">Send DMCA Notices</h3>
            <p className="text-sm text-slate-300">Generate takedown notices and email them directly from your dashboard.</p>
          </div>
        </div>
      </section>

      <section id="pricing" className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6 sm:p-8">
        <h2 className="text-2xl font-semibold text-white">Simple Pricing</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">
          Built for creators and teams that publish frequently and cannot afford to lose organic distribution to content theft.
        </p>
        <div className="mt-6 flex flex-col gap-4 rounded-xl border border-slate-700 bg-slate-900 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-4xl font-semibold text-white">$15<span className="text-lg text-slate-300">/month</span></p>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Unlimited monitored URLs</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> On-demand scans + cron automation</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> DMCA drafting and send support</li>
            </ul>
          </div>
          <Button asChild size="lg">
            <a href={stripeLink}>Buy Now on Stripe</a>
          </Button>
        </div>
      </section>

      <section id="faq" className="space-y-3">
        <h2 className="text-2xl font-semibold text-white">FAQ</h2>
        <div className="space-y-3">
          {faqs.map((item) => (
            <details key={item.question} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <summary className="cursor-pointer list-none text-base font-medium text-white">{item.question}</summary>
              <p className="mt-3 text-sm text-slate-300">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}

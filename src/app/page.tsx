import {
  ArrowRight,
  BellRing,
  Bot,
  CircleDollarSign,
  Clock3,
  FileText,
  Frown,
  HandCoins,
  ListChecks,
  MessageSquareText,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingDown,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { FullLogo, LogoMark } from "@/components/brand";
import { CountUp, Reveal } from "@/components/landing/reveal";
import { integrationModes } from "@/lib/env";
import { supabaseForRequest } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "COLLECTIQ: Do the work. Let your agent get you paid.",
  description: "An AI agent that creates invoices, sends them through PayPal, and follows up until you're paid, within the rules you set.",
};

async function viewerState(): Promise<"signed-in" | "signed-out" | "demo"> {
  await connection();
  if (integrationModes().data !== "supabase") return "demo";
  try {
    const sb = await supabaseForRequest();
    const { data } = await sb.auth.getUser();
    return data.user ? "signed-in" : "signed-out";
  } catch {
    return "signed-out";
  }
}

const FEED = [
  { icon: FileText, tone: "text-sky-400", title: "Invoice drafted", body: "Sarah Chen · Branding · $850.00" },
  { icon: Send, tone: "text-emerald-400", title: "Sent via PayPal", body: "INV2-QGDY-CTJX · due Nov 16" },
  { icon: BellRing, tone: "text-amber-400", title: "Friendly reminder sent", body: "3 days before due · policy allowed" },
  { icon: CircleDollarSign, tone: "text-emerald-400", title: "Payment received", body: "$850.00 · verified with PayPal" },
];

const PROBLEMS = [
  { icon: Clock3, stat: 29, suffix: "%", text: "of freelance invoices are paid late", source: "Bonsai, 100,000+ freelancers" },
  { icon: TrendingDown, stat: 56, suffix: "%", text: "of US small businesses are owed money on unpaid invoices", source: "QuickBooks Late Payments Report 2025" },
  { icon: Frown, stat: 8, suffix: "+ hrs", text: "a month spent chasing payments instead of doing paid work", source: "Jobbers.io Freelance Payment Report 2025" },
];

const PAINS = [
  "Writing awkward “just following up…” emails",
  "Tracking who owes what across spreadsheets",
  "Forgetting to remind until it's 30 days late",
  "No clear view of money coming in next month",
];

const STEPS = [
  { icon: MessageSquareText, title: "Ask in plain words", body: "“Invoice Sarah $850 for branding, due in 7 days.” The agent finds the client and drafts it from your real records." },
  { icon: Send, title: "Send through PayPal", body: "One approval creates and sends a real PayPal invoice. Clients pay by PayPal, card or Pay Later." },
  { icon: Bot, title: "Autopilot follows up", body: "Your collection policy sends polite reminders on schedule, checking PayPal first so paid invoices are never chased." },
  { icon: HandCoins, title: "Get paid, see it all", body: "Verified PayPal payments flip invoices to Paid. Dashboards show what's due, overdue and coming in." },
];

export default async function LandingPage() {
  const state = await viewerState();
  const primary =
    state === "signed-in"
      ? { href: "/overview", label: "Open dashboard" }
      : state === "demo"
        ? { href: "/overview", label: "Open the live demo" }
        : { href: "/login?mode=signup", label: "Create free account" };

  return (
    <div className="dark min-h-dvh bg-[#0B1220] text-[#E5E7EB]">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0B1220]/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Link href="/" aria-label="COLLECTIQ home" className="w-32 shrink-0 sm:w-48">
            <FullLogo onDark />
          </Link>
          <nav className="ml-auto hidden items-center gap-6 text-sm text-[#94A3B8] md:flex" aria-label="Sections">
            <a href="#problem" className="hover:text-white">What we solve</a>
            <a href="#how" className="hover:text-white">What we do</a>
            <a href="#trust" className="hover:text-white">Safety</a>
          </nav>
          <div className="ml-auto flex items-center gap-2 md:ml-6">
            {state === "signed-out" && (
              <Link href="/login" className="whitespace-nowrap rounded-[10px] px-2.5 py-2 text-sm font-medium text-[#E5E7EB] hover:bg-white/5">
                Sign in
              </Link>
            )}
            <Link href={primary.href} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-[10px] bg-[#10B981] px-3 py-2 text-sm font-semibold text-[#04120c] hover:bg-[#10D69A]">
              <span className="hidden sm:inline">{primary.label}</span>
              <span className="sm:hidden">{state === "signed-out" ? "Get started" : "Open"}</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="ciq-glow pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(16,185,129,0.35),transparent)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-2 lg:pt-20">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#10B981]/30 bg-[#10B981]/10 px-3 py-1 text-xs font-medium text-[#34D399]">
              <Sparkles className="size-3.5" /> AI collections agent · built on PayPal + Claude
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-[3.4rem]">
              Do the work.
              <br />
              <span className="bg-gradient-to-r from-[#10D69A] to-[#3B82F6] bg-clip-text text-transparent">Let your agent get you paid.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-[#94A3B8] sm:text-lg">
              COLLECTIQ creates your invoices, sends them through PayPal, and follows up on schedule until you&apos;re paid, always within the rules you set and with every action logged.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href={primary.href} className="ciq-pulse inline-flex items-center gap-2 rounded-[12px] bg-[#10B981] px-5 py-3 text-sm font-semibold text-[#04120c] hover:bg-[#10D69A]">
                {primary.label} <ArrowRight className="size-4" />
              </Link>
              <a href="#how" className="inline-flex items-center gap-2 rounded-[12px] border border-white/10 px-5 py-3 text-sm font-medium text-[#E5E7EB] hover:bg-white/5">
                See how it works
              </a>
            </div>
            <p className="mt-4 text-xs text-[#64748B]">For freelancers, consultants and creative studios.</p>
          </Reveal>

          {/* Animated product preview */}
          <Reveal delay={150}>
            <div className="ciq-float relative mx-auto w-full max-w-md">
              <div className="rounded-[18px] border border-white/10 bg-[#111827]/90 p-4 shadow-2xl shadow-black/50">
                <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                  <LogoMark className="size-6" />
                  <span className="text-sm font-semibold text-white">Agent activity</span>
                  <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-[#10B981]/10 px-2 py-0.5 text-[11px] text-[#34D399]">
                    <span className="size-1.5 rounded-full bg-[#10B981]" /> Live
                  </span>
                </div>
                <div className="mt-3 rounded-[12px] border border-white/5 bg-[#0B1220] px-3 py-2.5 text-[13px] text-[#94A3B8]">
                  <span className="text-[#34D399]">You:</span> Invoice Sarah $850 for branding, due in 7 days
                </div>
                <ul className="mt-3 space-y-2" aria-label="Example agent activity">
                  {FEED.map((f, i) => (
                    <li key={f.title} className="ciq-feed-item flex items-start gap-3 rounded-[12px] border border-white/5 bg-white/[0.02] p-3" style={{ animationDelay: `${i * 1.6}s` }}>
                      <span className="rounded-[10px] bg-white/5 p-2">
                        <f.icon className={`size-4 ${f.tone}`} />
                      </span>
                      <div>
                        <p className="text-[13px] font-medium text-white">{f.title}</p>
                        <p className="text-xs text-[#94A3B8]">{f.body}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="absolute -bottom-5 -left-5 hidden rounded-[14px] border border-white/10 bg-[#111827] px-4 py-3 shadow-xl sm:block">
                <p className="text-[11px] text-[#94A3B8]">Collected this month</p>
                <p className="text-lg font-semibold text-white">
                  <CountUp to={4250} prefix="$" />
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* What we solve */}
      <section id="problem" className="border-t border-white/5 bg-[#0D1526] py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#10B981]">What we solve</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">Freelancers finish the work, then become unpaid debt collectors.</h2>
            <p className="mt-4 text-[#94A3B8]">Late payments drain cash flow and time, and chasing clients is awkward. Most invoicing tools send one generic reminder and leave the rest to you.</p>
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {PROBLEMS.map((p, i) => (
              <Reveal key={p.text} delay={i * 120}>
                <div className="h-full rounded-[16px] border border-white/5 bg-[#111827] p-6">
                  <p.icon className="size-5 text-[#F59E0B]" />
                  <p className="mt-4 text-4xl font-bold tracking-tight text-white">
                    <CountUp to={p.stat} suffix={p.suffix} />
                  </p>
                  <p className="mt-2 text-sm text-[#CBD5E1]">{p.text}</p>
                  <p className="mt-3 text-[11px] text-[#64748B]">{p.source}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={200}>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {PAINS.map((t) => (
                <li key={t} className="flex items-center gap-3 rounded-[12px] border border-white/5 bg-white/[0.02] px-4 py-3 text-sm text-[#94A3B8]">
                  <span className="relative inline-block">
                    {t}
                    <span className="absolute left-0 top-1/2 h-px w-full bg-[#EF4444]/70" aria-hidden />
                  </span>
                  <span className="ml-auto shrink-0 text-xs font-medium text-[#34D399]">handled</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* What we do */}
      <section id="how" className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#10B981]">What we do</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">From “I finished the job” to “paid” on autopilot.</h2>
          </Reveal>
          <div className="relative mt-12">
            <div aria-hidden className="ciq-flow-line absolute left-0 right-0 top-7 hidden h-[2px] rounded-full opacity-60 lg:block" />
            <ol className="relative grid gap-6 lg:grid-cols-4">
              {STEPS.map((s, i) => (
                <Reveal key={s.title} delay={i * 140}>
                  <li className="h-full list-none">
                    <span className="relative z-10 grid size-14 place-items-center rounded-[16px] border border-[#10B981]/30 bg-[#111827] text-[#10B981] shadow-lg shadow-[#10B981]/10">
                      <s.icon className="size-6" />
                    </span>
                    <p className="mt-5 text-xs font-semibold text-[#64748B]">Step {i + 1}</p>
                    <h3 className="mt-1 text-lg font-semibold text-white">{s.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">{s.body}</p>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section id="trust" className="border-t border-white/5 bg-[#0D1526] py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-2">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#10B981]">Autonomous, not reckless</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">You set the rules. The agent shows its work.</h2>
            <p className="mt-4 text-[#94A3B8]">
              A permission service separate from the AI checks every action. Sensitive steps wait for your approval, and every decision is logged with the reason and the PayPal reference.
            </p>
          </Reveal>
          <Reveal delay={150}>
            <ul className="grid gap-3">
              {[
                [ShieldCheck, "Never moves money, refunds or changes amounts on its own"],
                [ListChecks, "Approvals for sending invoices and escalations"],
                [BellRing, "Checks PayPal before every reminder, never chases paid invoices"],
                [Bot, "Never invents clients, amounts or payment status"],
              ].map(([Icon, t]) => {
                const I = Icon as typeof ShieldCheck;
                return (
                  <li key={t as string} className="flex items-center gap-3 rounded-[12px] border border-white/5 bg-[#111827] px-4 py-3.5 text-sm text-[#E5E7EB]">
                    <I className="size-4 shrink-0 text-[#10B981]" /> {t as string}
                  </li>
                );
              })}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <Reveal className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <LogoMark className="mx-auto size-12" />
          <h2 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">Spend your time on the work, not the chasing.</h2>
          <p className="mt-3 text-[#94A3B8]">Connect PayPal, set your collection style, and let your agent take it from there.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href={primary.href} className="inline-flex items-center gap-2 rounded-[12px] bg-[#10B981] px-5 py-3 text-sm font-semibold text-[#04120c] hover:bg-[#10D69A]">
              {primary.label} <ArrowRight className="size-4" />
            </Link>
            {state === "signed-out" && (
              <Link href="/login" className="rounded-[12px] border border-white/10 px-5 py-3 text-sm font-medium hover:bg-white/5">
                Sign in
              </Link>
            )}
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-white/5 py-8 text-center text-xs text-[#64748B]">
        COLLECTIQ · Built for the PayPal AI Hackathon 2026 · PayPal Sandbox · MIT licensed
      </footer>
    </div>
  );
}

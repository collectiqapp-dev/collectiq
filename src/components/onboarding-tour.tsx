"use client";

import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { LogoMark } from "@/components/brand";
import { Button } from "@/components/ui/button";

interface Step {
  target?: string; // data-tour value; omitted = centered card
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    title: "Welcome to COLLECTIQ",
    body: "Your AI agent creates invoices, sends them through PayPal, watches for payments and follows up for you, always within the rules you set. Here's a 1-minute tour.",
  },
  { target: "ask", title: "Ask your agent anything", body: "Type a request from any page, e.g. “Create an invoice for Sarah for $850 for branding, due in 7 days”. Press Ctrl+K to jump here." },
  { target: "nav-/command", title: "AI Command Center", body: "Chat with the agent. It only uses your real clients and invoices, and every action it proposes waits for your approval." },
  { target: "nav-/invoices", title: "Invoices", body: "Create, preview and send invoices through PayPal, send reminders and see each invoice's full history and PayPal status." },
  { target: "nav-/autopilot", title: "Collection Autopilot", body: "Set reminder policies (e.g. 3 days before due, 1 and 7 days after). Low-risk reminders run automatically; escalations need your OK." },
  { target: "nav-/activity", title: "Agent Activity", body: "A full audit trail: what the agent saw, why it acted, what the permission check said and what PayPal returned." },
  { target: "notifications", title: "Approvals & alerts", body: "Anything waiting for your decision shows up here." },
  { target: "nav-/settings", title: "Settings", body: "Import clients and invoices from Excel or CSV, fill your business details from your website, choose autonomy level and light or dark mode." },
];

type Rect = { top: number; left: number; width: number; height: number };

export function OnboardingTour({ open, onClose }: { open: boolean; onClose: (completed: boolean) => void }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const step = STEPS[i];

  const measure = useCallback(() => {
    if (!step?.target) return setRect(null);
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    if (!el || el.offsetParent === null) return setRect(null);
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step]);

  useLayoutEffect(() => {
    if (!open) return;
    // Measure after layout, in a frame callback (the target is an external DOM node).
    const id = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(id);
  }, [open, measure]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose(false);
      if (e.key === "ArrowRight") setI((x) => Math.min(x + 1, STEPS.length - 1));
      if (e.key === "ArrowLeft") setI((x) => Math.max(x - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", measure);
    };
  }, [open, onClose, measure]);

  if (!open || !step) return null;

  const pad = 6;
  const last = i === STEPS.length - 1;
  // Tooltip placement: to the right of sidebar items, below header items, centered otherwise.
  let pos: React.CSSProperties = { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  if (rect) {
    const rightOf = rect.left < 120;
    pos = rightOf
      ? { top: Math.max(12, Math.min(rect.top - 8, window.innerHeight - 220)), left: rect.left + rect.width + 16 }
      : { top: rect.top + rect.height + 14, left: Math.max(12, Math.min(rect.left, window.innerWidth - 340)) };
  }

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {rect ? (
        <div
          className="pointer-events-none absolute rounded-[12px] ring-2 ring-primary transition-all duration-200"
          style={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2, boxShadow: "0 0 0 9999px rgba(2,6,15,0.66)" }}
        />
      ) : (
        <div className="absolute inset-0 bg-[rgba(2,6,15,0.66)]" />
      )}
      <div className="absolute w-[min(320px,calc(100vw-24px))] rounded-[14px] border border-border bg-card p-4 shadow-2xl" style={pos}>
        <div className="flex items-start gap-2">
          {i === 0 && <LogoMark className="size-7" />}
          <h2 id="tour-title" className="flex-1 text-sm font-semibold">
            {step.title}
          </h2>
          <button onClick={() => onClose(false)} className="rounded-md p-1 text-muted-foreground hover:bg-muted" aria-label="Skip tour">
            <X className="size-4" />
          </button>
        </div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{step.body}</p>
        <div className="mt-4 flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">
            {i + 1} / {STEPS.length}
          </span>
          <div className="ml-auto flex gap-1.5">
            {i === 0 ? (
              <Button variant="ghost" size="sm" onClick={() => onClose(false)}>
                Skip
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setI(i - 1)} aria-label="Previous">
                <ArrowLeft />
              </Button>
            )}
            <Button size="sm" onClick={() => (last ? onClose(true) : setI(i + 1))} autoFocus>
              {last ? "Finish" : i === 0 ? "Start tour" : "Next"} {!last && <ArrowRight />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

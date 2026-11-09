"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LoginForm } from "@/components/login-form";
import { cn } from "@/lib/utils";

type AuthMode = "login" | "signup";
const EVENT = "ciq-auth";

/** Button that opens the in-hero auth panel instead of navigating to /login. */
export function AuthTrigger({ mode, className, children }: { mode: AuthMode; className?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        window.dispatchEvent(new CustomEvent<AuthMode>(EVENT, { detail: mode }));
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
    >
      {children}
    </button>
  );
}

/**
 * Right side of the hero: shows the product preview until a sign-in / sign-up
 * trigger fires, then cross-slides to the auth form (and back on close).
 */
export function HeroAuthPanel({ preview }: { preview: React.ReactNode }) {
  const [mode, setMode] = useState<AuthMode | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const open = (e: Event) => setMode((e as CustomEvent<AuthMode>).detail);
    window.addEventListener(EVENT, open);
    // Deep links like /?auth=signup open the panel directly.
    const q = new URLSearchParams(window.location.search).get("auth");
    if (q === "signup" || q === "login") window.dispatchEvent(new CustomEvent<AuthMode>(EVENT, { detail: q }));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMode(null);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(EVENT, open);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (!mode) return;
    // On small screens the panel sits below the headline: bring it into view.
    const t = setTimeout(() => {
      if (window.innerWidth < 1024) panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      panelRef.current?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
    }, 450);
    return () => clearTimeout(t);
  }, [mode]);

  const open = mode !== null;
  return (
    <div ref={panelRef} className="relative mx-auto grid w-full max-w-md scroll-mt-24 [&>*]:col-start-1 [&>*]:row-start-1">
      <div
        aria-hidden={open}
        inert={open}
        className={cn(
          "transition-all duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)]",
          open ? "pointer-events-none translate-x-10 scale-95 opacity-0 blur-sm" : "translate-x-0 scale-100 opacity-100 blur-0",
        )}
      >
        {preview}
      </div>

      <div
        aria-hidden={!open}
        inert={!open}
        className={cn(
          "self-center transition-all duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)]",
          open ? "translate-x-0 opacity-100 delay-150" : "pointer-events-none translate-x-12 opacity-0",
        )}
      >
        <div className="relative rounded-[18px] border border-white/10 bg-[#111827]/95 p-1 shadow-2xl shadow-black/50 ring-1 ring-[#10B981]/20">
          <div className="flex items-center justify-between px-4 pt-4">
            <div>
              <p className="text-base font-semibold text-white">{mode === "signup" ? "Create your account" : "Welcome back"}</p>
              <p className="mt-0.5 text-xs text-[#94A3B8]">{mode === "signup" ? "Free to start. Connect PayPal when you're ready." : "Sign in to your COLLECTIQ workspace."}</p>
            </div>
            <button onClick={() => setMode(null)} className="rounded-md p-1.5 text-[#94A3B8] hover:bg-white/5 hover:text-white" aria-label="Close sign-in panel">
              <X className="size-4" />
            </button>
          </div>
          {/* key remounts the form so the requested mode is applied each time */}
          {open && <LoginForm key={mode} initialMode={mode ?? "login"} embedded onModeChange={setMode} />}
        </div>
      </div>
    </div>
  );
}

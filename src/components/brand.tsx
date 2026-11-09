/* eslint-disable @next/next/no-img-element -- static brand SVGs, no optimisation needed */
import { cn } from "@/lib/utils";

/** Official COLLECTIQ C-check symbol (public/collectiq-symbol.svg). */
export function LogoMark({ className }: { className?: string }) {
  return <img src="/collectiq-symbol.svg" alt="COLLECTIQ" className={cn("size-8 shrink-0", className)} />;
}

/** Wordmark: COLLECT + emerald IQ, for places where the full logo image doesn't fit. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-bold tracking-tight", className)}>
      COLLECT<span className="text-[#10B981]">IQ</span>
    </span>
  );
}

/** Full logo with tagline; `onDark` uses the light-text variant. */
export function FullLogo({ onDark = false, className }: { onDark?: boolean; className?: string }) {
  return (
    <img
      src={onDark ? "/collectiq-logo-dark.svg" : "/collectiq-logo.svg"}
      alt="COLLECTIQ: Do the work. Let your agent get you paid."
      className={cn("h-auto w-full", className)}
    />
  );
}

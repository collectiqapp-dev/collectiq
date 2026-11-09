import { cn } from "@/lib/utils";

/** Brand mark: emerald rounded "C" enclosing a checkmark. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("size-8 shrink-0", className)} role="img" aria-label="COLLECTIQ">
      <rect width="40" height="40" rx="11" fill="#10B981" />
      <path d="M28.5 12.6A11 11 0 1 0 28.5 27.4" fill="none" stroke="#0B1220" strokeWidth="4" strokeLinecap="round" />
      <path d="M14.5 20.2l3.6 3.6 7.4-7.6" fill="none" stroke="#0B1220" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Wordmark: COLLECT + emerald IQ. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-bold tracking-wide", className)}>
      COLLECT<span className="text-[#10B981]">IQ</span>
    </span>
  );
}

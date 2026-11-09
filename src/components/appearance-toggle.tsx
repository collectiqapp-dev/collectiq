"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { key: "dark", label: "Dark", icon: Moon },
  { key: "light", label: "Light", icon: Sun },
  { key: "system", label: "Match system", icon: Monitor },
] as const;

/** Theme choice, stored in the browser (next-themes) and applied on every page. */
export function AppearanceToggle() {
  const { theme, setTheme } = useTheme();
  // true only after hydration, so the server and first client render match
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  return (
    <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Theme">
      {OPTIONS.map(({ key, label, icon: Icon }) => {
        const active = mounted && theme === key;
        return (
          <button
            key={key}
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(key)}
            className={cn(
              "flex items-center gap-2.5 rounded-[12px] border p-3 text-left text-sm font-medium transition-colors",
              active ? "border-primary bg-primary-soft/60 text-foreground" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            <Icon className="size-4" /> {label}
          </button>
        );
      })}
    </div>
  );
}

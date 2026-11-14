"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const subscribe = () => () => {};

/** Bascule clair / sombre. L'icône n'est rendue qu'après hydratation (thème inconnu côté serveur). */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const isDark = resolvedTheme !== "light";
  const label = !mounted
    ? "Changer de thème"
    : isDark
      ? "Passer en thème clair"
      : "Passer en thème sombre";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={label}
      title={label}
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-amber-vivid focus-visible:outline-none",
        className,
      )}
    >
      {mounted && !isDark ? (
        <Moon className="size-5" aria-hidden="true" />
      ) : (
        <Sun
          className={cn("size-5", !mounted && "opacity-0")}
          aria-hidden="true"
        />
      )}
    </button>
  );
}

import {
  BADGE_ON_DARK,
  BADGE_ON_SURFACE,
  badgePulses,
  type BadgeTone,
} from "@/features/projects/badge-tones";
import { cn } from "@/lib/utils";

/** Badge éditorial d'un projet : sur la couverture d'une carte ou sur fond de page. */
export function ProjectBadge({
  label,
  tone,
  placement,
  className,
}: {
  label: string;
  tone: BadgeTone;
  placement: "overlay" | "surface";
  className?: string;
}) {
  const colors =
    placement === "overlay" ? BADGE_ON_DARK[tone] : BADGE_ON_SURFACE[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[11px]",
        placement === "overlay"
          ? "bg-panel-dark/85 backdrop-blur-sm"
          : cn("border", BADGE_ON_SURFACE[tone].surface),
        colors.text,
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-block size-1.5 rounded-full",
          colors.dot,
          badgePulses(tone) && "pulse-dot",
        )}
      />
      {label}
    </span>
  );
}

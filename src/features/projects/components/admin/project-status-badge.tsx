import type { ContentStatusValue } from "@/features/projects/schemas";
import { cn } from "@/lib/utils";

const STATUS = {
  DRAFT: { label: "brouillon", className: "bg-muted text-muted-foreground" },
  PUBLISHED: {
    label: "publié",
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
  ARCHIVED: {
    label: "archivé",
    className: "bg-amber-brand/15 text-amber-brand",
  },
} satisfies Record<ContentStatusValue, { label: string; className: string }>;

export function ProjectStatusBadge({ status }: { status: ContentStatusValue }) {
  const { label, className } = STATUS[status];
  return (
    <span
      className={cn(
        "rounded-md px-1.5 py-0.5 font-mono text-[11px] whitespace-nowrap",
        className,
      )}
    >
      {label}
    </span>
  );
}

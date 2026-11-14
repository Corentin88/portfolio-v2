import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AdminPageHeader({
  kicker,
  title,
  description,
}: {
  kicker: string;
  title: string;
  description?: string;
}) {
  return (
    <div>
      <p className="font-mono text-xs text-amber-brand">{`// ${kicker}`}</p>
      <h1 className="mt-1 font-display text-2xl font-semibold">{title}</h1>
      {description ? (
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function AdminCard({
  title,
  titleId,
  description,
  children,
  className,
}: {
  title: string;
  titleId: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        "rounded-2xl border border-border bg-card p-5 sm:p-6",
        className,
      )}
    >
      <h2 id={titleId} className="font-display text-lg font-semibold">
        {title}
      </h2>
      {description ? (
        <div className="mt-1 text-sm text-muted-foreground">{description}</div>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Ligne d'une liste éditable : résumé, actions, et formulaire d'édition repliable. */
export function EditableRow({
  summary,
  actions,
  children,
}: {
  summary: ReactNode;
  actions: ReactNode;
  children: ReactNode;
}) {
  return (
    <li className="rounded-xl border border-border bg-background/60">
      <div className="flex flex-wrap items-center justify-between gap-3 p-3">
        <div className="min-w-0 flex-1">{summary}</div>
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      </div>
      <details className="group border-t border-border">
        <summary className="cursor-pointer list-none px-3 py-2 text-sm text-link group-open:font-medium hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          Modifier
        </summary>
        <div className="px-3 pb-4">{children}</div>
      </details>
    </li>
  );
}

export function HiddenBadge() {
  return (
    <span className="ml-2 rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
      masqué
    </span>
  );
}

export function EmptyList({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}

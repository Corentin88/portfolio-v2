import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  STATUS_LABELS,
  messageStatus,
} from "@/features/contact/message-status";
import type { ContactMessageSummary } from "@/features/contact/queries";

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

export function formatMessageDate(date: Date): string {
  return dateFormat.format(date);
}

const STATUS_STYLES = {
  unread: "bg-amber-vivid text-amber-ink",
  read: "bg-muted text-muted-foreground",
  handled:
    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30",
} as const;

export function MessageStatusBadge({
  message,
}: {
  message: Pick<ContactMessageSummary, "readAt" | "handledAt">;
}) {
  const status = messageStatus(message);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 font-mono text-[11px] font-medium",
        STATUS_STYLES[status],
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function NotificationFailedBadge() {
  return (
    <span className="inline-flex shrink-0 items-center rounded-md border border-destructive/40 px-1.5 py-0.5 font-mono text-[11px] text-destructive">
      e-mail non parti
    </span>
  );
}

/** Ligne de message cliquable (liste et tableau de bord). */
export function MessageRow({ message }: { message: ContactMessageSummary }) {
  const unread = messageStatus(message) === "unread";
  return (
    <li>
      <Link
        href={`/admin/messages/${message.id}`}
        className="flex flex-col gap-1.5 rounded-xl border border-border bg-background/60 p-3 transition-colors hover:border-amber-brand/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:flex-row sm:items-center sm:gap-4"
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span
            className={cn(
              "truncate text-sm",
              unread ? "font-semibold" : "font-medium",
            )}
          >
            {message.name}{" "}
            <span className="font-normal text-muted-foreground">
              &lt;{message.email}&gt;
            </span>
          </span>
          <span className="truncate text-sm text-muted-foreground">
            {message.subject || "(sans sujet)"}
          </span>
        </span>
        <span className="flex flex-wrap items-center gap-2">
          {message.notifiedAt ? null : <NotificationFailedBadge />}
          <MessageStatusBadge message={message} />
          <time
            dateTime={message.createdAt.toISOString()}
            className="font-mono text-xs text-muted-foreground"
          >
            {formatMessageDate(message.createdAt)}
          </time>
        </span>
      </Link>
    </li>
  );
}

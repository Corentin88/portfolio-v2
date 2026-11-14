import Link from "next/link";
import { notFound } from "next/navigation";
import { Reply } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/features/auth/require-admin";
import {
  DeleteMessageButton,
  MarkAsReadOnView,
  MessageStatusButtons,
  ResendNotificationButton,
} from "@/features/contact/components/admin/message-actions";
import {
  MessageStatusBadge,
  NotificationFailedBadge,
  formatMessageDate,
} from "@/features/contact/components/admin/message-ui";
import { messageStatus } from "@/features/contact/message-status";
import { getContactMessage } from "@/features/contact/queries";
import { idSchema } from "@/lib/validation";

function replyHref(email: string, subject: string | null): string {
  const reply = `Re: ${subject || "Votre message"}`;
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(reply)}`;
}

export default async function AdminMessagePage({
  params,
}: PageProps<"/admin/messages/[id]">) {
  await requireAdmin();
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();

  const message = await getContactMessage(id);
  if (!message) notFound();

  const status = messageStatus(message);

  return (
    <div className="space-y-6">
      <Link
        href="/admin/messages"
        className="inline-block text-sm text-link hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        ← Tous les messages
      </Link>

      <AdminPageHeader
        kicker="message"
        title={message.subject || "(sans sujet)"}
      />

      <article
        aria-labelledby="message-from"
        className="rounded-2xl border border-border bg-card p-5 sm:p-6"
      >
        <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[7rem_1fr]">
          <dt className="font-mono text-xs tracking-wider text-muted-foreground uppercase sm:pt-0.5">
            De
          </dt>
          <dd id="message-from" className="font-medium wrap-break-word">
            {message.name}
          </dd>
          <dt className="font-mono text-xs tracking-wider text-muted-foreground uppercase sm:pt-0.5">
            E-mail
          </dt>
          <dd className="break-all">{message.email}</dd>
          <dt className="font-mono text-xs tracking-wider text-muted-foreground uppercase sm:pt-0.5">
            Reçu le
          </dt>
          <dd>
            <time dateTime={message.createdAt.toISOString()}>
              {formatMessageDate(message.createdAt)}
            </time>
          </dd>
          <dt className="font-mono text-xs tracking-wider text-muted-foreground uppercase sm:pt-0.5">
            Statut
          </dt>
          <dd className="flex flex-wrap gap-2">
            <MessageStatusBadge message={message} />
            {message.notifiedAt ? null : <NotificationFailedBadge />}
          </dd>
        </dl>

        {/* Texte rendu par React (échappé), sauts de ligne conservés. */}
        <div className="mt-5 rounded-xl border-l-4 border-amber-brand bg-muted/50 p-4 text-sm leading-relaxed wrap-break-word whitespace-pre-wrap">
          {message.message}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <a
            href={replyHref(message.email, message.subject)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-amber-vivid px-3 text-sm font-medium text-amber-ink hover:bg-amber-vivid/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Reply className="size-4" aria-hidden="true" />
            Répondre par e-mail
          </a>
          <MessageStatusButtons id={message.id} status={status} />
        </div>

        {message.notifiedAt ? null : (
          <div className="mt-5 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
            <p className="mb-3 text-destructive">
              La notification e-mail de ce message n&apos;a pas pu être envoyée.
            </p>
            <ResendNotificationButton id={message.id} />
          </div>
        )}

        <div className="mt-6 border-t border-border pt-4">
          <DeleteMessageButton id={message.id} name={message.name} />
        </div>
      </article>

      <MarkAsReadOnView id={message.id} unread={status === "unread"} />
    </div>
  );
}

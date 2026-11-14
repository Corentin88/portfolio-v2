import Link from "next/link";
import { Search } from "lucide-react";
import { AdminPageHeader, EmptyList } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/features/auth/require-admin";
import { MessageRow } from "@/features/contact/components/admin/message-ui";
import {
  STATUS_LABELS,
  messagesListHref,
} from "@/features/contact/message-status";
import { listContactMessages } from "@/features/contact/queries";
import { formatRetention } from "@/features/contact/retention";
import {
  MESSAGE_STATUSES,
  parseMessageListParams,
} from "@/features/contact/schemas";
import { purgeExpiredMessages } from "@/features/contact/service";
import { getContactRetentionDays } from "@/lib/env";
import { cn } from "@/lib/utils";

const FILTERS = [
  { value: "all", label: "Tous" },
  ...MESSAGE_STATUSES.map((status) => ({
    value: status,
    label: STATUS_LABELS[status],
  })),
] as const;

export default async function AdminMessagesPage({
  searchParams,
}: PageProps<"/admin/messages">) {
  await requireAdmin();
  const params = parseMessageListParams(await searchParams);
  const retentionDays = getContactRetentionDays();
  // Purge à la consultation : pas de tâche planifiée à maintenir.
  await purgeExpiredMessages(retentionDays);
  const { items, total, page, pageCount } = await listContactMessages(params);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        kicker="messages"
        title="Messages reçus"
        description={`Messages envoyés depuis le formulaire de contact. Ils sont supprimés automatiquement après ${formatRetention(retentionDays)}.`}
      />

      <div className="space-y-3 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <form
          role="search"
          action="/admin/messages"
          className="flex flex-col gap-2 sm:flex-row"
        >
          {params.status !== "all" ? (
            <input type="hidden" name="status" value={params.status} />
          ) : null}
          <label htmlFor="messages-search" className="sr-only">
            Rechercher par nom, e-mail ou sujet
          </label>
          <input
            id="messages-search"
            name="q"
            type="search"
            defaultValue={params.q}
            maxLength={100}
            placeholder="Nom, e-mail ou sujet…"
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:border-royal focus-visible:ring-2 focus-visible:ring-royal/40 focus-visible:outline-none"
          />
          <button
            type="submit"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-royal px-4 text-sm font-medium text-white hover:bg-royal/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Search className="size-4" aria-hidden="true" />
            Rechercher
          </button>
        </form>

        <nav aria-label="Filtrer par statut">
          <ul className="flex flex-wrap gap-2">
            {FILTERS.map((filter) => {
              const active = params.status === filter.value;
              return (
                <li key={filter.value}>
                  <Link
                    href={messagesListHref({
                      q: params.q,
                      status: filter.value,
                    })}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex h-8 items-center rounded-full border px-3 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      active
                        ? "border-royal bg-royal text-white"
                        : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {filter.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {total === 0
          ? "Aucun message."
          : `${total} message${total > 1 ? "s" : ""}${params.q ? ` pour « ${params.q} »` : ""}.`}
      </p>

      {items.length === 0 ? (
        <EmptyList>
          {params.q || params.status !== "all"
            ? "Aucun message ne correspond à ces critères."
            : "Aucun message reçu pour le moment."}
        </EmptyList>
      ) : (
        <ul className="space-y-2">
          {items.map((message) => (
            <MessageRow key={message.id} message={message} />
          ))}
        </ul>
      )}

      {pageCount > 1 ? (
        <nav
          aria-label="Pagination"
          className="flex items-center justify-between gap-3 text-sm"
        >
          {page > 1 ? (
            <Link
              href={messagesListHref({ ...params, page: page - 1 })}
              className="rounded-lg border border-border px-3 py-1.5 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              ← Précédents
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted-foreground">
            Page {page} sur {pageCount}
          </span>
          {page < pageCount ? (
            <Link
              href={messagesListHref({ ...params, page: page + 1 })}
              className="rounded-lg border border-border px-3 py-1.5 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              Suivants →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}

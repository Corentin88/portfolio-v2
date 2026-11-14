import type {
  MessageListParams,
  MessageStatus,
} from "@/features/contact/schemas";

/** URL de la liste, sans les paramètres par défaut (adresses courtes et stables). */
export function messagesListHref(params: Partial<MessageListParams>): string {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.status && params.status !== "all") {
    search.set("status", params.status);
  }
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const query = search.toString();
  return query ? `/admin/messages?${query}` : "/admin/messages";
}

type StatusDates = { readAt: Date | null; handledAt: Date | null };

/** Traité prime sur lu ; sans date, le message est non lu. */
export function messageStatus(message: StatusDates): MessageStatus {
  if (message.handledAt) return "handled";
  if (message.readAt) return "read";
  return "unread";
}

/** Filtre Prisma correspondant à un statut. */
export function statusWhere(status: MessageStatus) {
  switch (status) {
    case "unread":
      return { readAt: null, handledAt: null };
    case "read":
      return { readAt: { not: null }, handledAt: null };
    case "handled":
      return { handledAt: { not: null } };
  }
}

/**
 * Dates à enregistrer pour passer au statut demandé. La première date de
 * lecture est conservée ; un message traité est aussi considéré comme lu.
 */
export function statusUpdate(
  status: MessageStatus,
  current: StatusDates,
  now: Date,
): StatusDates {
  switch (status) {
    case "unread":
      return { readAt: null, handledAt: null };
    case "read":
      return { readAt: current.readAt ?? now, handledAt: null };
    case "handled":
      return {
        readAt: current.readAt ?? now,
        handledAt: current.handledAt ?? now,
      };
  }
}

export const STATUS_LABELS: Record<MessageStatus, string> = {
  unread: "Non lu",
  read: "Lu",
  handled: "Traité",
};

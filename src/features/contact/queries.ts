import { db } from "@/lib/db";
import { requireAdmin } from "@/features/auth/require-admin";
import { statusWhere } from "@/features/contact/message-status";
import {
  MESSAGES_PAGE_SIZE,
  type MessageListParams,
} from "@/features/contact/schemas";

// Données personnelles : chaque lecture revérifie la session (défense en
// profondeur, en plus du layout protégé) et rien n'est mis en cache.

const summarySelect = {
  id: true,
  name: true,
  email: true,
  subject: true,
  readAt: true,
  handledAt: true,
  notifiedAt: true,
  createdAt: true,
} as const;

function searchWhere(q: string) {
  if (!q) return {};
  // Collation insensible à la casse et aux accents : contains suffit.
  return {
    OR: [
      { name: { contains: q } },
      { email: { contains: q } },
      { subject: { contains: q } },
    ],
  };
}

export async function listContactMessages(params: MessageListParams) {
  await requireAdmin();
  const where = {
    ...searchWhere(params.q),
    ...(params.status === "all" ? {} : statusWhere(params.status)),
  };

  const total = await db.contactMessage.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / MESSAGES_PAGE_SIZE));
  // Une page au-delà de la fin (suppressions, URL modifiée) affiche la dernière.
  const page = Math.min(params.page, pageCount);
  const items = await db.contactMessage.findMany({
    where,
    select: summarySelect,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * MESSAGES_PAGE_SIZE,
    take: MESSAGES_PAGE_SIZE,
  });
  return { items, total, page, pageCount };
}

export type ContactMessageSummary = Awaited<
  ReturnType<typeof listContactMessages>
>["items"][number];

export async function getContactMessage(id: string) {
  await requireAdmin();
  return db.contactMessage.findUnique({
    where: { id },
    select: { ...summarySelect, message: true },
  });
}

export type ContactMessageDetail = NonNullable<
  Awaited<ReturnType<typeof getContactMessage>>
>;

/** Compteurs et derniers messages pour le menu et le tableau de bord. */
export async function getMessagesOverview(latest = 5) {
  await requireAdmin();
  const [unread, notNotified, recent] = await Promise.all([
    db.contactMessage.count({ where: statusWhere("unread") }),
    db.contactMessage.count({ where: { notifiedAt: null } }),
    latest > 0
      ? db.contactMessage.findMany({
          select: summarySelect,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: latest,
        })
      : Promise.resolve([]),
  ]);
  return { unread, notNotified, recent };
}

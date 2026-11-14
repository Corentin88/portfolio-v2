import Link from "next/link";
import { AdminCard, AdminPageHeader } from "@/components/admin/admin-ui";
import { revokeAllSessionsAction } from "@/features/auth/actions";
import { requireAdmin } from "@/features/auth/require-admin";
import { MessageRow } from "@/features/contact/components/admin/message-ui";
import { getMessagesOverview } from "@/features/contact/queries";

const SECTIONS = [
  {
    href: "/admin/projets",
    title: "Projets",
    text: "Projets, versions, technologies, captures et publication.",
  },
  {
    href: "/admin/contenus",
    title: "Contenus",
    text: "Accueil, présentation, coordonnées et réseaux.",
  },
  { href: "/admin/seo", title: "SEO", text: "Titre et description du site." },
  {
    href: "/admin/competences",
    title: "Compétences",
    text: "Catégories et piliers de compétences.",
  },
  {
    href: "/admin/technologies",
    title: "Technologies",
    text: "Référentiel des technologies et leur affichage.",
  },
  {
    href: "/admin/timeline",
    title: "Timeline",
    text: "Étapes du parcours, ordre et visibilité.",
  },
  {
    href: "/admin/categories",
    title: "Catégories de projets",
    text: "Filtres du catalogue de projets.",
  },
  {
    href: "/admin/medias",
    title: "Médias et CV",
    text: "Bibliothèque d'images, CV et image de partage.",
  },
] as const;

export default async function AdminDashboardPage() {
  // Défense en profondeur : chaque page sensible revérifie la session.
  const admin = await requireAdmin();
  const messages = await getMessagesOverview(5);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        kicker="tableau de bord"
        title={`Bonjour ${admin.name}`}
        description="Toute modification enregistrée ici est visible immédiatement sur le site public."
      />

      <AdminCard
        title="Messages"
        titleId="messages-title"
        description={
          <>
            <strong className="text-foreground">{messages.unread}</strong> non
            lu{messages.unread > 1 ? "s" : ""}
            {messages.notNotified > 0 ? (
              <span className="text-destructive">
                {" "}
                · {messages.notNotified} notification
                {messages.notNotified > 1 ? "s" : ""} e-mail non partie
                {messages.notNotified > 1 ? "s" : ""}
              </span>
            ) : null}
          </>
        }
      >
        {messages.recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun message reçu pour le moment.
          </p>
        ) : (
          <ul className="space-y-2">
            {messages.recent.map((message) => (
              <MessageRow key={message.id} message={message} />
            ))}
          </ul>
        )}
        <Link
          href="/admin/messages"
          className="mt-4 inline-block text-sm text-link hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          Tous les messages →
        </Link>
      </AdminCard>

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {SECTIONS.map((section) => (
          <li key={section.href}>
            <Link
              href={section.href}
              className="block h-full rounded-2xl border border-border bg-card p-5 transition-colors hover:border-amber-brand/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <p className="font-display font-semibold">{section.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {section.text}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      <AdminCard
        title="Sessions"
        titleId="sessions-title"
        description="Déconnecte ce navigateur et tous les autres appareils connectés à ce compte."
        className="max-w-xl"
      >
        <form action={revokeAllSessionsAction}>
          <button
            type="submit"
            className="rounded-lg border border-destructive/40 px-3 py-1.5 text-sm text-destructive transition-colors hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-destructive/40 focus-visible:outline-none"
          >
            Déconnecter toutes les sessions
          </button>
        </form>
      </AdminCard>
    </div>
  );
}

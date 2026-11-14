import { Suspense } from "react";
import Link from "next/link";
import { AdminNav } from "@/components/admin/admin-nav";
import { logoutAction } from "@/features/auth/actions";
import { requireAdmin } from "@/features/auth/require-admin";
import { getMessagesOverview } from "@/features/contact/queries";

// Avec cacheComponents, la lecture de session doit se faire sous <Suspense>
// (sinon le build échoue) ; la barrière d'accès vit donc dans un composant enfant.
export default function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <Suspense
        fallback={
          <p className="p-6 text-sm text-muted-foreground">Chargement…</p>
        }
      >
        <AdminShell>{children}</AdminShell>
      </Suspense>
    </div>
  );
}

async function AdminShell({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const { unread } = await getMessagesOverview(0);

  return (
    <>
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/admin"
            className="flex items-center gap-3 rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <span className="font-display text-lg leading-none font-bold">
              Corentin<span className="text-amber-brand">.</span>Lanaud
            </span>
            <span className="rounded-md bg-amber-vivid px-2 py-0.5 font-mono text-xs font-medium text-amber-ink">
              {"// admin"}
            </span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              Voir le site
            </Link>
            <span className="hidden text-muted-foreground sm:inline">
              {admin.name}
            </span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-lg border border-border px-3 py-1.5 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                Se déconnecter
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto grid w-full max-w-7xl flex-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[13rem_1fr] lg:py-8">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <AdminNav unreadMessages={unread} />
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </>
  );
}

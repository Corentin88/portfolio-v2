import Link from "next/link";
import { LoginForm } from "@/features/auth/components/login-form";

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <main className="w-full max-w-md">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-display text-xl leading-none font-bold text-foreground">
              Corentin<span className="text-amber-brand">.</span>Lanaud
            </span>
            <span className="rounded-md bg-amber-vivid px-2 py-0.5 font-mono text-xs font-medium text-amber-ink">
              {"// admin"}
            </span>
          </div>
          <h1 className="mt-4 font-display text-lg font-semibold text-foreground">
            Connexion à l&apos;administration
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Espace réservé au propriétaire du portfolio.
          </p>

          <LoginForm />
        </div>

        <div className="mt-4 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <span aria-hidden="true">←</span> Voir le site
          </Link>
        </div>
      </main>
    </div>
  );
}

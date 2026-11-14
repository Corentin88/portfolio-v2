"use client";

// Les détails de l'erreur restent dans les journaux du serveur : rien n'est affiché au visiteur.
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <p className="font-mono text-sm text-amber-brand">{"// erreur"}</p>
      <h1 className="font-display text-2xl font-bold">
        Le site est momentanément indisponible
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Une erreur est survenue lors du chargement. Réessayez dans un instant.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-full bg-amber-vivid px-5 py-2 font-semibold text-amber-ink transition-colors hover:bg-amber-vivid/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        Réessayer
      </button>
    </main>
  );
}

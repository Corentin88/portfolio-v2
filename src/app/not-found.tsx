import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <p className="font-mono text-sm text-amber-brand">{"// 404"}</p>
      <h1 className="font-display text-2xl font-bold">Page introuvable</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Cette page n&apos;existe pas ou a été déplacée.
      </p>
      <Link
        href="/"
        className="rounded-full bg-amber-vivid px-5 py-2 font-semibold text-amber-ink transition-colors hover:bg-amber-vivid/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        Retour à l&apos;accueil
      </Link>
    </main>
  );
}

import Image from "next/image";
import { GitBranch } from "lucide-react";
import type { PublicImage } from "@/features/media/media-view";

const OWNER_NAME = "Corentin Lanaud";
const OWNER_INITIALS = "CL";

/**
 * Carte de visite façon onglet d'éditeur de code : en-tête de fichier, photo (ou
 * initiales), quelques lignes de « code » et barre de statut. Le décor est masqué
 * aux lecteurs d'écran ; seuls le nom, la photo et le statut sont annoncés.
 */
export function BusinessCard({
  photo,
  statusLabel,
}: {
  photo: PublicImage | null;
  statusLabel: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-royal/20">
      {/* Onglet du fichier ouvert */}
      <div
        aria-hidden="true"
        className="flex items-end border-b border-border bg-muted/60 px-2 pt-2"
      >
        <span className="inline-flex items-center gap-2 rounded-t-lg border border-b-0 border-border bg-card px-3 py-1.5 font-mono text-xs text-foreground">
          <span className="size-2 rounded-full bg-amber-brand" />
          corentin.lanaud.tsx
        </span>
      </div>

      <div className="px-6 pt-5 pb-6 sm:px-8">
        <p
          aria-hidden="true"
          className="font-mono text-xs text-muted-foreground italic"
        >
          {"// carte de visite"}
        </p>

        <div className="mt-6 flex flex-col items-center text-center">
          <ProfilePicture photo={photo} />
          <p className="mt-6 font-display text-2xl font-bold text-foreground">
            {OWNER_NAME}
          </p>
          <p className="mt-1 font-mono text-sm text-amber-brand">
            développeur_full_stack.ts
          </p>
        </div>

        <div className="mt-7 rounded-lg border border-border bg-muted/40 py-3 font-mono text-[11px] leading-relaxed sm:text-xs">
          <p aria-hidden="true" className="flex gap-3 pr-3">
            <span className="w-6 shrink-0 text-right text-muted-foreground/60 select-none">
              1
            </span>
            <span className="min-w-0 text-muted-foreground">
              <span className="text-link">const</span> motivation{" "}
              <span className="text-amber-brand">=</span>{" "}
              <span className="text-green-700 dark:text-green-300">
                &quot;apprendre, coder, recommencer&quot;
              </span>
              ;
            </span>
          </p>
          <p className="mt-1 flex gap-3 pr-3">
            <span
              aria-hidden="true"
              className="w-6 shrink-0 text-right text-muted-foreground/60 select-none"
            >
              2
            </span>
            <span className="inline-flex min-w-0 items-center gap-2 text-foreground">
              <span
                aria-hidden="true"
                className="size-1.5 shrink-0 rounded-full bg-green-500"
              />
              {statusLabel}
            </span>
          </p>
        </div>
      </div>

      {/* Barre de statut de l'éditeur */}
      <div
        aria-hidden="true"
        className="flex items-center justify-between gap-3 bg-royal px-4 py-1.5 font-mono text-[11px] text-white"
      >
        <span className="inline-flex items-center gap-1.5">
          <GitBranch className="size-3.5" />
          main
        </span>
        <span className="flex gap-3 text-white/85">
          <span>TypeScript</span>
          <span>UTF-8</span>
        </span>
      </div>
    </div>
  );
}

function ProfilePicture({ photo }: { photo: PublicImage | null }) {
  const frame =
    "relative size-28 rounded-2xl shadow-lg shadow-royal/40 transition-transform duration-500 group-hover:scale-105 group-hover:rotate-1 motion-reduce:transition-none motion-reduce:group-hover:transform-none sm:size-32";

  return (
    <div className={frame}>
      {photo ? (
        <Image
          src={photo.src}
          width={photo.width}
          height={photo.height}
          alt={photo.alt}
          unoptimized
          sizes="128px"
          // Portrait : cadrage carré centré légèrement vers le haut (visage).
          className="size-full rounded-2xl object-cover object-[50%_30%]"
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex size-full items-center justify-center rounded-2xl bg-gradient-to-br from-royal to-royal-light font-display text-5xl font-bold text-white"
        >
          {OWNER_INITIALS}
        </span>
      )}
      <span
        aria-hidden="true"
        className="absolute -right-2 -bottom-2 flex size-8 items-center justify-center rounded-xl bg-amber-vivid font-mono text-sm font-bold text-amber-ink shadow-md"
      >
        {"</>"}
      </span>
    </div>
  );
}

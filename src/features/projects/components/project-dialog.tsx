"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { ProjectDetail } from "@/features/projects/components/project-detail";
import { useModalDialog } from "@/components/shared/use-modal-dialog";
import type { PublicProjectDetail } from "@/features/projects/public-view";

const TITLE_ID = "project-dialog-title";

/**
 * Modale de la route interceptée /projets/[slug]. Dialogue natif : focus piégé,
 * Échap, fond inerte. Fermer revient à l'entrée précédente de l'historique
 * (le catalogue), comme le bouton Retour du navigateur.
 */
export function ProjectDialog({
  project,
  initialVersion,
}: {
  project: PublicProjectDetail;
  initialVersion: string | null;
}) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);

  useModalDialog(ref);

  const close = () => router.back();

  const closeButton = (
    <button
      type="button"
      onClick={close}
      aria-label="Fermer la fiche projet"
      className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-foreground/5 text-muted-foreground transition-colors hover:border-foreground/30 hover:bg-foreground/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-amber-brand focus-visible:outline-none"
    >
      <X className="size-4.5" aria-hidden="true" />
    </button>
  );

  return (
    <dialog
      ref={ref}
      aria-labelledby={TITLE_ID}
      onCancel={(event) => {
        // React propage « cancel » dans son arbre : Échap dans l'agrandissement
        // (dialogue imbriqué) ne doit fermer que lui, pas toute la fiche.
        if (event.target !== event.currentTarget) return;
        // Échap : on laisse le routeur fermer (sinon l'URL resterait /projets/…).
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-navy-deep/80 backdrop:backdrop-blur-sm"
    >
      {/* Fiche remise à zéro à chaque ouverture depuis le catalogue (version de
          l'URL, galerie), mais conservée par les boutons précédent/suivant. */}
      <ProjectDetail
        key={router.bfcacheId}
        project={project}
        initialVersion={initialVersion}
        titleId={TITLE_ID}
        titleAs="h2"
        headerAction={closeButton}
        stickyHeader
      />
    </dialog>
  );
}

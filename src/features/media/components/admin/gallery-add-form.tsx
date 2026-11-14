"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { addVersionScreenshotsAction } from "@/features/media/actions";
import { MediaPickerDialog } from "@/features/media/components/admin/media-picker";
import type { PickerValue } from "@/features/media/picker";

/**
 * Ajout de plusieurs images à la galerie d'une version. Le sélecteur ne fait que
 * préparer la liste ; l'ajout (en fin de galerie, dans l'ordre choisi, sans
 * doublon) n'a lieu qu'à l'envoi du formulaire. L'ordre existant n'est pas modifié.
 * Monté avec une clé dérivée de la galerie : la liste se vide après l'ajout.
 */
export function GalleryAddForm({
  versionId,
  existingIds,
}: {
  versionId: string;
  existingIds: string[];
}) {
  const [pending, setPending] = useState<PickerValue[]>([]);
  const [open, setOpen] = useState(false);
  const openerRef = useRef<HTMLButtonElement>(null);

  const close = () => {
    setOpen(false);
    requestAnimationFrame(() => openerRef.current?.focus());
  };

  return (
    <ActionForm
      action={addVersionScreenshotsAction}
      className="space-y-3 rounded-lg border border-dashed border-border p-3"
    >
      <input type="hidden" name="versionId" value={versionId} />
      <input
        type="hidden"
        name="mediaIds"
        value={pending.map((media) => media.id).join(",")}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          ref={openerRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <ImagePlus className="size-4" aria-hidden="true" />
          Choisir des images…
        </button>
        <span className="text-xs text-muted-foreground">
          Ajoutées en fin de galerie, dans l&apos;ordre de sélection.
        </span>
      </div>

      {pending.length > 0 ? (
        <>
          <ul aria-label="Images à ajouter" className="flex flex-wrap gap-2">
            {pending.map((media) => (
              <li
                key={media.id}
                className="relative size-20 overflow-hidden rounded-lg border border-border bg-muted"
              >
                {media.thumbSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element -- miniature privée servie telle quelle
                  <img
                    src={media.thumbSrc}
                    alt={media.alt}
                    className="size-full object-cover"
                  />
                ) : null}
                <button
                  type="button"
                  onClick={() =>
                    setPending((list) =>
                      list.filter((item) => item.id !== media.id),
                    )
                  }
                  aria-label={`Ne pas ajouter « ${media.name} »`}
                  className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-panel-dark/85 text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          <SubmitButton>
            Ajouter {pending.length} image(s) à la galerie
          </SubmitButton>
        </>
      ) : null}

      {open ? (
        <MediaPickerDialog
          title="Images à ajouter à la galerie"
          accept="IMAGE"
          multiple
          excludedIds={existingIds}
          initialSelection={pending}
          onConfirm={(selection) => {
            setPending(selection);
            close();
          }}
          onClose={close}
        />
      ) : null}
    </ActionForm>
  );
}

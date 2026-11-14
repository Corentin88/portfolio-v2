"use client";

import { useId, useRef, useState } from "react";
import { FileText, ImageIcon, X } from "lucide-react";
import { MediaPickerDialog } from "@/features/media/components/admin/media-picker";
import type { MediaAccept, PickerValue } from "@/features/media/picker";
import { cn } from "@/lib/utils";

const buttonClass =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

type MediaPickerFieldProps = {
  /** Nom du champ envoyé avec le formulaire parent (identifiant ou vide). */
  name: string;
  label: string;
  hint?: string;
  accept: MediaAccept;
  initial: PickerValue | null;
  /** Ce qui s'affiche sur le site sans média (« initiales CL », « icône »…). */
  emptyLabel: string;
  /** Aperçu : couverture (16/9) ou logo/photo (carré, image entière). */
  shape?: "video" | "square";
};

/**
 * Champ de sélection d'un média, à placer dans un formulaire existant. Choisir,
 * remplacer ou retirer ne modifie que ce champ : l'association n'est enregistrée
 * qu'à la validation du formulaire parent (contrôle du type refait côté serveur).
 */
export function MediaPickerField({
  name,
  label,
  hint,
  accept,
  initial,
  emptyLabel,
  shape = "square",
}: MediaPickerFieldProps) {
  const [value, setValue] = useState<PickerValue | null>(initial);
  const [open, setOpen] = useState(false);
  const openerRef = useRef<HTMLButtonElement>(null);
  const labelId = useId();
  const hintId = useId();
  const changed = (value?.id ?? null) !== (initial?.id ?? null);

  const close = () => {
    setOpen(false);
    // Le dialogue est démonté : le focus revient sur le bouton d'ouverture.
    requestAnimationFrame(() => openerRef.current?.focus());
  };

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      aria-describedby={hint ? hintId : undefined}
      className="space-y-1.5"
    >
      <p id={labelId} className="text-sm font-medium">
        {label}
      </p>
      <input type="hidden" name={name} value={value?.id ?? ""} />
      <div className="flex flex-wrap items-center gap-3">
        <div
          className={cn(
            "flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted",
            shape === "video" ? "aspect-video w-40" : "size-20",
          )}
        >
          {value?.thumbSrc ? (
            // eslint-disable-next-line @next/next/no-img-element -- miniature privée servie telle quelle
            <img
              src={value.thumbSrc}
              alt={value.alt}
              className={cn(
                "size-full",
                shape === "video" ? "object-cover" : "object-contain",
              )}
            />
          ) : value ? (
            <FileText
              className="size-8 text-muted-foreground"
              aria-hidden="true"
            />
          ) : (
            <ImageIcon
              className="size-6 text-muted-foreground/60"
              aria-hidden="true"
            />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="truncate text-sm">
            {value ? (
              value.name
            ) : (
              <span className="text-muted-foreground">{emptyLabel}</span>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              ref={openerRef}
              type="button"
              onClick={() => setOpen(true)}
              aria-haspopup="dialog"
              className={buttonClass}
            >
              {value ? "Remplacer…" : "Choisir un média…"}
            </button>
            {value ? (
              <button
                type="button"
                onClick={() => setValue(null)}
                className={buttonClass}
              >
                <X className="size-4" aria-hidden="true" />
                Retirer
              </button>
            ) : null}
          </div>
          {changed ? (
            <p className="text-xs text-amber-brand" aria-live="polite">
              Modification non enregistrée : validez le formulaire.
            </p>
          ) : null}
        </div>
      </div>
      {hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {open ? (
        <MediaPickerDialog
          title={label}
          accept={accept}
          multiple={false}
          currentIds={value ? [value.id] : []}
          onConfirm={([media]) => {
            if (media) setValue(media);
            close();
          }}
          onClose={close}
        />
      ) : null}
    </div>
  );
}

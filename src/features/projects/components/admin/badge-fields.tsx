"use client";

import { useState, type ChangeEvent } from "react";
import { SelectField, TextField } from "@/components/admin/fields";
import {
  BADGE_TONE_OPTIONS,
  toBadgeTone,
} from "@/features/projects/badge-tones";
import { ProjectBadge } from "@/features/projects/components/project-badge";

/**
 * Texte et couleur du badge, avec un aperçu tel qu'affiché sur le site (sur la
 * couverture d'une carte et sur la fiche). Les champs restent non contrôlés :
 * l'aperçu suit les saisies par délégation d'événements.
 */
export function BadgeFields({
  idPrefix,
  label,
  tone,
}: {
  idPrefix: string;
  label: string | null;
  tone: string | null;
}) {
  const [preview, setPreview] = useState({
    label: label ?? "",
    tone: toBadgeTone(tone),
  });

  const onChange = (event: ChangeEvent<HTMLDivElement>) => {
    const target = event.target as unknown as HTMLInputElement;
    if (target.name === "badgeLabel") {
      setPreview((current) => ({ ...current, label: target.value }));
    } else if (target.name === "badgeTone") {
      setPreview((current) => ({
        ...current,
        tone: toBadgeTone(target.value),
      }));
    }
  };

  const text = preview.label.trim();

  return (
    <div onChange={onChange} className="space-y-3 sm:col-span-2">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          name="badgeLabel"
          label="Badge (facultatif)"
          hint="État éditorial saisi à la main, sans lien avec la publication."
          maxLength={40}
          idPrefix={idPrefix}
          defaultValue={label}
        />
        <SelectField
          name="badgeTone"
          label="Couleur du badge"
          idPrefix={idPrefix}
          defaultValue={toBadgeTone(tone)}
          options={BADGE_TONE_OPTIONS}
        />
      </div>
      <div
        aria-live="polite"
        className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground"
      >
        <span>Aperçu :</span>
        {text ? (
          <>
            <span className="rounded-lg bg-slate-700 p-2">
              <ProjectBadge
                label={text}
                tone={preview.tone}
                placement="overlay"
              />
            </span>
            <ProjectBadge
              label={text}
              tone={preview.tone}
              placement="surface"
            />
          </>
        ) : (
          <span>aucun badge affiché.</span>
        )}
      </div>
    </div>
  );
}

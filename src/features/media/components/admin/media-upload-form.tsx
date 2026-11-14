"use client";

import { useState, type ChangeEvent } from "react";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { CheckboxField, TextAreaField } from "@/components/admin/fields";
import { uploadMediaAction } from "@/features/media/actions";
import {
  ACCEPTED_FILE_TYPES,
  MAX_DOCUMENT_BYTES,
  MAX_IMAGE_BYTES,
} from "@/features/media/file-validation";

/**
 * Formulaire d'upload. Le contrôle de taille ici n'évite qu'un envoi inutile :
 * le serveur refait tous les contrôles (signature, taille, décodage).
 * Réutilisé hors de la médiathèque (photo, timeline, logos) : l'image envoyée
 * rejoint la bibliothèque et apparaît aussitôt dans les listes de choix.
 */
export function MediaUploadForm({
  idPrefix = "upload-",
  allowCv = true,
  folder,
}: {
  idPrefix?: string;
  /** false : formulaire limité aux images (pas de case « CV »). */
  allowCv?: boolean;
  /** Dossier de destination (dossier ouvert) ; absent = « Non classés ». */
  folder?: { id: string; name: string } | null;
} = {}) {
  const fileId = `${idPrefix}file`;
  const hintId = `${idPrefix}file-hint`;
  const [fileError, setFileError] = useState<string | null>(null);

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return setFileError(null);
    const isPdf = /\.pdf$/i.test(file.name);
    const max = isPdf ? MAX_DOCUMENT_BYTES : MAX_IMAGE_BYTES;
    setFileError(
      file.size > max
        ? `Fichier trop volumineux : ${max / (1024 * 1024)} Mo maximum pour ${isPdf ? "un PDF" : "une image"}.`
        : null,
    );
  };

  return (
    <ActionForm action={uploadMediaAction} className="space-y-4">
      <input type="hidden" name="folderId" value={folder?.id ?? ""} />
      <p className="text-xs text-muted-foreground">
        Destination :{" "}
        <strong className="font-medium text-foreground">
          {folder?.name ?? "Non classés"}
        </strong>
      </p>
      <div className="space-y-1.5">
        <label htmlFor={fileId} className="block text-sm font-medium">
          Fichier
        </label>
        <input
          id={fileId}
          name="file"
          type="file"
          required
          accept={ACCEPTED_FILE_TYPES}
          onChange={onFileChange}
          aria-invalid={fileError ? true : undefined}
          aria-describedby={hintId}
          className="block w-full text-sm file:mr-3 file:rounded-lg file:border file:border-border file:bg-muted file:px-3 file:py-1.5 file:text-sm file:text-foreground"
        />
        <p id={hintId} className="text-xs text-muted-foreground">
          Images JPEG, PNG, WebP ou AVIF (8 Mo maximum, converties en WebP,
          métadonnées supprimées) ou PDF (10 Mo maximum). SVG refusé.
        </p>
        {fileError ? (
          <p role="alert" className="text-sm text-destructive">
            {fileError}
          </p>
        ) : null}
      </div>
      <TextAreaField
        name="alt"
        label="Texte alternatif"
        hint="Obligatoire pour une image : décrivez ce qu'elle montre. Facultatif pour un PDF."
        maxLength={300}
        rows={2}
        idPrefix={idPrefix}
      />
      {allowCv ? (
        <CheckboxField
          name="useAsCv"
          label="Définir ce PDF comme CV du site"
          idPrefix={idPrefix}
          defaultChecked={false}
        />
      ) : null}
      <SubmitButton disabled={fileError !== null}>Envoyer</SubmitButton>
    </ActionForm>
  );
}

import {
  CheckboxField,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/admin/fields";
import { MediaPickerField } from "@/features/media/components/admin/media-picker-field";
import { toPickerValue } from "@/features/media/picker";
import { BadgeFields } from "@/features/projects/components/admin/badge-fields";
import { PROJECT_ICON_OPTIONS } from "@/features/projects/icons";
import type { ProjectFormOptions } from "@/features/projects/queries";

type ProjectFieldValues = {
  title: string;
  slug: string;
  summary: string;
  context: string | null;
  badgeLabel: string | null;
  badgeTone: string;
  iconKey: string;
  iconMediaId: string | null;
  iconMedia: { id: string; storageKey: string; alt: string } | null;
  featured: boolean;
  categoryId: string;
  seoTitle: string | null;
  seoDescription: string | null;
};

/** Champs communs à la création et à la modification d'un projet. */
export function ProjectFields({
  idPrefix,
  categories,
  values,
}: {
  idPrefix: string;
  categories: ProjectFormOptions["categories"];
  values?: ProjectFieldValues;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          name="title"
          label="Titre"
          maxLength={120}
          idPrefix={idPrefix}
          defaultValue={values?.title}
          required
        />
        <TextField
          name="slug"
          label="Slug (adresse /projets/…)"
          hint="Vide : dérivé du titre. Le modifier change l'adresse publique."
          maxLength={140}
          idPrefix={idPrefix}
          defaultValue={values?.slug}
        />
      </div>
      <TextAreaField
        name="summary"
        label="Résumé (cartes et en-tête de la fiche)"
        maxLength={400}
        rows={3}
        idPrefix={idPrefix}
        defaultValue={values?.summary}
        required
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          name="categoryId"
          label="Catégorie"
          idPrefix={idPrefix}
          defaultValue={values?.categoryId}
          options={[
            { value: "", label: "Choisir une catégorie…" },
            ...categories.map((category) => ({
              value: category.id,
              label: category.name,
            })),
          ]}
        />
        <TextField
          name="context"
          label="Contexte (facultatif)"
          hint="Ex. projet personnel, formation, client."
          maxLength={120}
          idPrefix={idPrefix}
          defaultValue={values?.context}
        />
        <BadgeFields
          idPrefix={idPrefix}
          label={values?.badgeLabel ?? null}
          tone={values?.badgeTone ?? null}
        />
      </div>
      <fieldset className="rounded-lg border border-border px-3 pt-2 pb-3">
        <legend className="px-1 text-sm font-medium">Icône du projet</legend>
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr] sm:items-start">
          <MediaPickerField
            key={values?.iconMediaId ?? "none"}
            name="iconMediaId"
            label="Logo (médiathèque)"
            hint="Prioritaire sur l'icône du catalogue. PNG ou WebP transparent conseillé."
            accept="IMAGE"
            initial={toPickerValue(values?.iconMedia ?? null)}
            emptyLabel="Aucun (icône du catalogue)"
          />
          <SelectField
            name="iconKey"
            label="Icône du catalogue (repli)"
            idPrefix={idPrefix}
            defaultValue={values?.iconKey ?? "code"}
            options={PROJECT_ICON_OPTIONS}
          />
        </div>
      </fieldset>
      <CheckboxField
        name="featured"
        label="Mis en avant (carte double largeur)"
        idPrefix={idPrefix}
        defaultChecked={values?.featured ?? false}
      />
      <details className="rounded-lg border border-border px-3 py-2">
        <summary className="cursor-pointer text-sm font-medium">
          Référencement de la fiche (facultatif)
        </summary>
        <div className="mt-3 space-y-4 pb-2">
          <TextField
            name="seoTitle"
            label="Titre SEO"
            hint="Vide : titre du projet."
            maxLength={70}
            idPrefix={idPrefix}
            defaultValue={values?.seoTitle}
          />
          <TextAreaField
            name="seoDescription"
            label="Description SEO"
            hint="Vide : résumé du projet."
            maxLength={160}
            rows={2}
            idPrefix={idPrefix}
            defaultValue={values?.seoDescription}
          />
        </div>
      </details>
    </div>
  );
}

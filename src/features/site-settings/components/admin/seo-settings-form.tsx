import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { TextAreaField, TextField } from "@/components/admin/fields";
import { updateSeoSettingsAction } from "@/features/site-settings/actions";
import type { AdminSiteSettings } from "@/features/site-settings/queries";

export function SeoSettingsForm({ settings }: { settings: AdminSiteSettings }) {
  return (
    <ActionForm action={updateSeoSettingsAction} className="space-y-4">
      <TextField
        name="seoTitle"
        label="Titre de la page d'accueil"
        hint="Affiché dans l'onglet du navigateur et les résultats de recherche (70 caractères maximum)."
        maxLength={70}
        defaultValue={settings.seoTitle}
        required
      />
      <TextAreaField
        name="seoDescription"
        label="Description"
        hint="Résumé affiché sous le titre dans les moteurs de recherche (160 caractères maximum)."
        maxLength={160}
        rows={3}
        defaultValue={settings.seoDescription}
        required
      />
      <SubmitButton>Enregistrer le SEO</SubmitButton>
    </ActionForm>
  );
}

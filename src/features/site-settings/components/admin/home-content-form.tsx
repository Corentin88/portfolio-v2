import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { TextAreaField, TextField } from "@/components/admin/fields";
import { updateHomeContentAction } from "@/features/site-settings/actions";
import type { AdminSiteSettings } from "@/features/site-settings/queries";

export function HomeContentForm({ settings }: { settings: AdminSiteSettings }) {
  return (
    <ActionForm action={updateHomeContentAction} className="space-y-6">
      <fieldset className="space-y-4">
        <legend className="font-mono text-xs text-amber-brand">
          {"// hero"}
        </legend>
        <TextField
          name="heroStatusLabel"
          label="Statut professionnel (badge)"
          maxLength={120}
          defaultValue={settings.heroStatusLabel}
          required
        />
        <TextField
          name="heroTagline"
          label="Accroche (ligne « $ … »)"
          maxLength={160}
          defaultValue={settings.heroTagline}
          required
        />
        <TextAreaField
          name="heroTaglineSub"
          label="Texte sous l'accroche"
          maxLength={400}
          rows={3}
          defaultValue={settings.heroTaglineSub}
          required
        />
        <TextField
          name="heroRoleLine"
          label="Ligne rôle (sous le grand titre)"
          maxLength={160}
          defaultValue={settings.heroRoleLine}
          required
        />
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-mono text-xs text-amber-brand">
          {"// présentation"}
        </legend>
        <TextField
          name="presentationTitle"
          label="Titre de la section"
          maxLength={120}
          defaultValue={settings.presentationTitle}
          required
        />
        <TextAreaField
          name="presentationBody"
          label="Texte de présentation"
          hint="Séparez les paragraphes par une ligne vide."
          maxLength={10_000}
          rows={8}
          defaultValue={settings.presentationBody}
          required
        />
        <TextAreaField
          name="presentationQuote"
          label="Citation mise en avant (facultative)"
          maxLength={300}
          rows={2}
          defaultValue={settings.presentationQuote}
        />
      </fieldset>

      <SubmitButton>Enregistrer l&apos;accueil</SubmitButton>
    </ActionForm>
  );
}

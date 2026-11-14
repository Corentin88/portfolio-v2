import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { TextField } from "@/components/admin/fields";
import { updateContactSettingsAction } from "@/features/site-settings/actions";
import { isPlaceholderEmail } from "@/features/site-settings/public-view";
import type { AdminSiteSettings } from "@/features/site-settings/queries";

export function ContactSettingsForm({
  settings,
}: {
  settings: AdminSiteSettings;
}) {
  const placeholder = isPlaceholderEmail(settings.contactEmail);

  return (
    <ActionForm action={updateContactSettingsAction} className="space-y-4">
      {placeholder ? (
        <p className="rounded-lg border border-amber-brand/40 bg-amber-vivid/10 px-3 py-2 text-sm">
          L&apos;adresse actuelle est une valeur provisoire : elle n&apos;est
          pas affichée sur le site et les boutons de contact restent masqués
          tant qu&apos;une adresse réelle n&apos;est pas enregistrée.
        </p>
      ) : null}
      <TextField
        name="contactEmail"
        label="E-mail de contact"
        type="email"
        maxLength={254}
        defaultValue={settings.contactEmail}
        required
      />
      <TextField
        name="availabilityNote"
        label="Note de disponibilité (facultative)"
        maxLength={200}
        defaultValue={settings.availabilityNote}
      />
      <TextField
        name="linkedinUrl"
        label="Profil LinkedIn"
        type="url"
        maxLength={500}
        hint="Laissé vide, le lien disparaît du site."
        defaultValue={settings.linkedinUrl}
      />
      <TextField
        name="githubUrl"
        label="Profil GitHub"
        type="url"
        maxLength={500}
        hint="Laissé vide, le lien disparaît du site."
        defaultValue={settings.githubUrl}
      />
      <SubmitButton>Enregistrer les coordonnées</SubmitButton>
    </ActionForm>
  );
}

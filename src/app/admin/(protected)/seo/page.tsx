import {
  AdminCard,
  AdminPageHeader,
  EmptyList,
} from "@/components/admin/admin-ui";
import { requireAdmin } from "@/features/auth/require-admin";
import { setSiteMediaAction } from "@/features/media/actions";
import { MediaSelectForm } from "@/features/media/components/admin/media-select-form";
import { toPickerValue } from "@/features/media/picker";
import { getAdminSiteMedia } from "@/features/media/queries";
import { SeoSettingsForm } from "@/features/site-settings/components/admin/seo-settings-form";
import { getAdminSiteSettings } from "@/features/site-settings/queries";

export default async function AdminSeoPage() {
  await requireAdmin();
  const [settings, siteMedia] = await Promise.all([
    getAdminSiteSettings(),
    getAdminSiteMedia(),
  ]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        kicker="seo"
        title="Référencement"
        description="Titre, description et image de partage de la page d'accueil."
      />
      {settings && siteMedia ? (
        <>
          <AdminCard
            title="Paramètres généraux"
            titleId="seo-title"
            className="max-w-2xl"
          >
            <SeoSettingsForm settings={settings} />
          </AdminCard>
          <AdminCard
            title="Image de partage (Open Graph)"
            titleId="seo-og-title"
            description="Aperçu affiché lors du partage du site sur les réseaux sociaux. Format conseillé : 1200×630 px."
            className="max-w-2xl"
          >
            <MediaSelectForm
              action={setSiteMediaAction}
              hidden={{ slot: "ogImage" }}
              label="Image"
              accept="IMAGE"
              current={toPickerValue(siteMedia.ogImageMedia)}
              emptyLabel="Aucune"
            />
          </AdminCard>
        </>
      ) : (
        <EmptyList>
          Les réglages du site n&apos;existent pas encore : lancez le seed
          initial.
        </EmptyList>
      )}
    </div>
  );
}

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
import { ContactSettingsForm } from "@/features/site-settings/components/admin/contact-settings-form";
import { HomeContentForm } from "@/features/site-settings/components/admin/home-content-form";
import { getAdminSiteSettings } from "@/features/site-settings/queries";

export default async function AdminContentsPage() {
  await requireAdmin();
  const [settings, siteMedia] = await Promise.all([
    getAdminSiteSettings(),
    getAdminSiteMedia(),
  ]);
  const photo = siteMedia?.profilePhotoMedia ?? null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        kicker="contenus"
        title="Contenus du site"
        description="Textes de l'accueil et de la présentation, photo de la carte de visite, coordonnées et liens sociaux."
      />
      {settings ? (
        <div className="grid gap-6 xl:grid-cols-[3fr_2fr] xl:items-start">
          <AdminCard title="Accueil et présentation" titleId="home-title">
            <HomeContentForm settings={settings} />
          </AdminCard>
          <div className="space-y-6">
            <AdminCard
              title="Photo de la carte de visite"
              titleId="profile-photo-title"
              description="Cadrage carré, centré sur le haut de l'image. Sans photo, les initiales « CL » sont affichées. Le texte alternatif est celui de l'image dans la médiathèque."
            >
              <MediaSelectForm
                action={setSiteMediaAction}
                hidden={{ slot: "profilePhoto" }}
                label="Photo"
                accept="IMAGE"
                current={toPickerValue(photo)}
                emptyLabel="Aucune (initiales CL)"
                shape="square"
              />
            </AdminCard>
            <AdminCard title="Coordonnées et réseaux" titleId="contact-title">
              <ContactSettingsForm settings={settings} />
            </AdminCard>
          </div>
        </div>
      ) : (
        <EmptyList>
          Les réglages du site n&apos;existent pas encore : lancez le seed
          initial.
        </EmptyList>
      )}
    </div>
  );
}

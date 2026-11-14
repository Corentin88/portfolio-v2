import { AdminPageHeader } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/features/auth/require-admin";
import { TechnologiesAdmin } from "@/features/skills/components/admin/technologies-admin";
import {
  listAdminSkillCategories,
  listAdminTechnologies,
} from "@/features/skills/queries";

export default async function AdminTechnologiesPage() {
  await requireAdmin();
  const [technologies, categories] = await Promise.all([
    listAdminTechnologies(),
    listAdminSkillCategories(),
  ]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        kicker="technologies"
        title="Technologies"
        description="Référentiel unique : une technologie créée ici est aussitôt proposée dans les versions de projets. Cochée « Afficher dans les compétences », elle apparaît aussi dans la section Compétences, dans sa catégorie et dans l'ordre défini ici."
      />
      <TechnologiesAdmin technologies={technologies} categories={categories} />
    </div>
  );
}

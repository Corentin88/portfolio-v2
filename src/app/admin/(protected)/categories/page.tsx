import { AdminPageHeader } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/features/auth/require-admin";
import { ProjectCategoriesAdmin } from "@/features/projects/components/admin/project-categories-admin";
import { listAdminProjectCategories } from "@/features/projects/queries";

export default async function AdminProjectCategoriesPage() {
  await requireAdmin();
  const categories = await listAdminProjectCategories();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        kicker="catégories"
        title="Catégories de projets"
        description="Filtres du catalogue public : chaque projet appartient à une catégorie."
      />
      <ProjectCategoriesAdmin categories={categories} />
    </div>
  );
}

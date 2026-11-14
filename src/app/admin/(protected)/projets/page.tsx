import { AdminPageHeader } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/features/auth/require-admin";
import { ProjectsAdmin } from "@/features/projects/components/admin/projects-admin";
import {
  listAdminProjects,
  listProjectFormOptions,
} from "@/features/projects/queries";

export default async function AdminProjectsPage() {
  await requireAdmin();
  const [projects, options] = await Promise.all([
    listAdminProjects(),
    listProjectFormOptions(),
  ]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        kicker="projets"
        title="Projets"
        description="Catalogue, versions, technologies et captures. Un brouillon ou un projet archivé n'apparaît jamais sur le site."
      />
      <ProjectsAdmin projects={projects} categories={options.categories} />
    </div>
  );
}

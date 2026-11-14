import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/features/auth/require-admin";
import { ProjectEditor } from "@/features/projects/components/admin/project-editor";
import {
  getAdminProject,
  listProjectFormOptions,
} from "@/features/projects/queries";
import { idSchema } from "@/lib/validation";

export default async function AdminProjectPage({
  params,
}: PageProps<"/admin/projets/[id]">) {
  await requireAdmin();
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();

  const [project, options] = await Promise.all([
    getAdminProject(id),
    listProjectFormOptions(),
  ]);
  if (!project) notFound();

  const isPublic =
    project.status === "PUBLISHED" &&
    project.versions.some((version) => version.status === "PUBLISHED");

  return (
    <div className="space-y-6">
      <AdminPageHeader
        kicker="projets"
        title={project.title}
        description={`Adresse publique : /projets/${project.slug}`}
      />
      <ProjectEditor project={project} options={options} isPublic={isPublic} />
    </div>
  );
}

import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/features/auth/require-admin";
import { ProjectMediaAdmin } from "@/features/media/components/admin/project-media-admin";
import { listAdminProjectMedia } from "@/features/media/queries";

export default async function AdminProjectMediaPage() {
  await requireAdmin();
  const projects = await listAdminProjectMedia();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        kicker="médias"
        title="Couvertures et galeries"
        description="Image d'une version : sa couverture, sinon sa première capture, sinon la couverture du projet, sinon une couverture générée."
      />
      <p className="text-sm">
        <Link
          href="/admin/medias"
          className="text-link hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          ← Bibliothèque et envoi de fichiers
        </Link>
      </p>
      <ProjectMediaAdmin projects={projects} />
    </div>
  );
}

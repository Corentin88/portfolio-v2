import { AdminPageHeader } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/features/auth/require-admin";
import { TimelineAdmin } from "@/features/timeline/components/admin/timeline-admin";
import { listAdminTimeline } from "@/features/timeline/queries";

export default async function AdminTimelinePage() {
  await requireAdmin();
  const entries = await listAdminTimeline();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        kicker="timeline"
        title="Parcours"
        description="Étapes affichées dans la section Timeline : ordre, contenu, illustration et visibilité."
      />
      <TimelineAdmin entries={entries} />
    </div>
  );
}

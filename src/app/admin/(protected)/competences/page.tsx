import { AdminPageHeader } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/features/auth/require-admin";
import { PillarsAdmin } from "@/features/skills/components/admin/pillars-admin";
import { SkillCategoriesAdmin } from "@/features/skills/components/admin/skill-categories-admin";
import {
  listAdminSkillCategories,
  listAdminSkillPillars,
} from "@/features/skills/queries";

export default async function AdminSkillsPage() {
  await requireAdmin();
  const [categories, pillars] = await Promise.all([
    listAdminSkillCategories(),
    listAdminSkillPillars(),
  ]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        kicker="compétences"
        title="Compétences"
        description="Piliers mis en avant et catégories de la section Compétences. Les technologies se gèrent dans leur propre écran."
      />
      <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
        <PillarsAdmin pillars={pillars} />
        <SkillCategoriesAdmin categories={categories} />
      </div>
    </div>
  );
}

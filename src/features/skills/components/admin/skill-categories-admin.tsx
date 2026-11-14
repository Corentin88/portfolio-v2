import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import {
  AdminCard,
  EditableRow,
  EmptyList,
  HiddenBadge,
} from "@/components/admin/admin-ui";
import { CheckboxField, TextField } from "@/components/admin/fields";
import {
  DeleteButton,
  MoveButtons,
} from "@/components/admin/list-item-actions";
import {
  createSkillCategoryAction,
  deleteSkillCategoryAction,
  moveSkillCategoryAction,
  updateSkillCategoryAction,
} from "@/features/skills/actions";
import type { AdminSkillCategory } from "@/features/skills/queries";

function CategoryFields({
  category,
  idPrefix,
}: {
  category?: AdminSkillCategory;
  idPrefix: string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
      <TextField
        name="name"
        label="Nom"
        maxLength={60}
        idPrefix={idPrefix}
        defaultValue={category?.name}
        required
      />
      <CheckboxField
        name="isVisible"
        label="Visible sur le site"
        idPrefix={idPrefix}
        defaultChecked={category?.isVisible ?? true}
      />
    </div>
  );
}

export function SkillCategoriesAdmin({
  categories,
}: {
  categories: AdminSkillCategory[];
}) {
  return (
    <AdminCard
      title="Catégories de compétences"
      titleId="skill-categories-title"
      description="Regroupent les technologies affichées dans la section Compétences. Une catégorie masquée masque ses technologies."
    >
      <ActionForm
        action={createSkillCategoryAction}
        className="mb-5 space-y-3 rounded-xl border border-dashed border-border p-4"
      >
        <CategoryFields idPrefix="new-category-" />
        <SubmitButton>Ajouter la catégorie</SubmitButton>
      </ActionForm>

      {categories.length === 0 ? (
        <EmptyList>Aucune catégorie.</EmptyList>
      ) : (
        <ol className="space-y-3">
          {categories.map((category, index) => (
            <EditableRow
              key={category.id}
              summary={
                <p className="truncate text-sm">
                  {category.name}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {category._count.technologies} technologie(s)
                  </span>
                  {category.isVisible ? null : <HiddenBadge />}
                </p>
              }
              actions={
                <>
                  <MoveButtons
                    id={category.id}
                    label={category.name}
                    action={moveSkillCategoryAction}
                    isFirst={index === 0}
                    isLast={index === categories.length - 1}
                  />
                  <DeleteButton
                    id={category.id}
                    label={category.name}
                    action={deleteSkillCategoryAction}
                    consequence={
                      category._count.technologies > 0
                        ? `Ses ${category._count.technologies} technologie(s) seront conservées et passeront dans « Autres ».`
                        : undefined
                    }
                  />
                </>
              }
            >
              <ActionForm
                action={updateSkillCategoryAction}
                className="space-y-3"
              >
                <input type="hidden" name="id" value={category.id} />
                <CategoryFields
                  category={category}
                  idPrefix={`${category.id}-`}
                />
                <SubmitButton>Enregistrer</SubmitButton>
              </ActionForm>
            </EditableRow>
          ))}
        </ol>
      )}
    </AdminCard>
  );
}

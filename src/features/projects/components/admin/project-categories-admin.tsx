import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { AdminCard, EditableRow, EmptyList } from "@/components/admin/admin-ui";
import { TextField } from "@/components/admin/fields";
import {
  DeleteButton,
  MoveButtons,
} from "@/components/admin/list-item-actions";
import {
  createProjectCategoryAction,
  deleteProjectCategoryAction,
  moveProjectCategoryAction,
  updateProjectCategoryAction,
} from "@/features/projects/actions";
import type { AdminProjectCategory } from "@/features/projects/queries";

export function ProjectCategoriesAdmin({
  categories,
}: {
  categories: AdminProjectCategory[];
}) {
  return (
    <div className="space-y-6">
      <AdminCard title="Ajouter une catégorie" titleId="category-new-title">
        <ActionForm action={createProjectCategoryAction} className="space-y-4">
          <TextField
            name="name"
            label="Nom"
            maxLength={60}
            idPrefix="new-"
            required
          />
          <SubmitButton>Ajouter la catégorie</SubmitButton>
        </ActionForm>
      </AdminCard>

      <AdminCard
        title={`Catégories (${categories.length})`}
        titleId="category-list-title"
        description="L'ordre est celui des filtres du catalogue public. Une catégorie n'apparaît sur le site que si elle contient un projet publié."
      >
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
                    <span className="ml-2 font-mono text-xs text-muted-foreground">
                      /{category.slug} · {category._count.projects} projet(s)
                    </span>
                  </p>
                }
                actions={
                  <>
                    <MoveButtons
                      id={category.id}
                      label={category.name}
                      action={moveProjectCategoryAction}
                      isFirst={index === 0}
                      isLast={index === categories.length - 1}
                    />
                    <DeleteButton
                      id={category.id}
                      label={category.name}
                      action={deleteProjectCategoryAction}
                    />
                  </>
                }
              >
                <ActionForm
                  action={updateProjectCategoryAction}
                  className="space-y-4"
                >
                  <input type="hidden" name="id" value={category.id} />
                  <TextField
                    name="name"
                    label="Nom"
                    maxLength={60}
                    idPrefix={`${category.id}-`}
                    defaultValue={category.name}
                    required
                  />
                  <SubmitButton>Enregistrer</SubmitButton>
                </ActionForm>
              </EditableRow>
            ))}
          </ol>
        )}
      </AdminCard>
    </div>
  );
}

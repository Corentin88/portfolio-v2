import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import {
  AdminCard,
  EditableRow,
  EmptyList,
  HiddenBadge,
} from "@/components/admin/admin-ui";
import {
  CheckboxField,
  SelectField,
  TextField,
} from "@/components/admin/fields";
import {
  DeleteButton,
  MoveButtons,
} from "@/components/admin/list-item-actions";
import {
  createTechnologyAction,
  deleteTechnologyAction,
  moveTechnologyAction,
  updateTechnologyAction,
} from "@/features/skills/actions";
import type {
  AdminSkillCategory,
  AdminTechnology,
} from "@/features/skills/queries";

type CategoryOption = { value: string; label: string };

function TechnologyFields({
  technology,
  categoryOptions,
  idPrefix,
}: {
  technology?: AdminTechnology;
  categoryOptions: CategoryOption[];
  idPrefix: string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <TextField
        name="name"
        label="Nom"
        maxLength={60}
        idPrefix={idPrefix}
        defaultValue={technology?.name}
        required
      />
      <SelectField
        name="skillCategoryId"
        label="Catégorie de compétences"
        options={categoryOptions}
        idPrefix={idPrefix}
        defaultValue={technology?.skillCategoryId ?? ""}
      />
      <CheckboxField
        name="showInSkills"
        label="Afficher dans les compétences"
        idPrefix={idPrefix}
        defaultChecked={technology?.showInSkills ?? true}
      />
    </div>
  );
}

/** Regroupe la liste par catégorie : l'ordre se règle à l'intérieur de chaque catégorie. */
function groupByCategory(technologies: AdminTechnology[]) {
  const groups = new Map<string, { name: string; items: AdminTechnology[] }>();
  for (const technology of technologies) {
    const key = technology.skillCategoryId ?? "none";
    const group = groups.get(key) ?? {
      name: technology.skillCategory?.name ?? "Sans catégorie (« Autres »)",
      items: [],
    };
    group.items.push(technology);
    groups.set(key, group);
  }
  return [...groups.entries()];
}

export function TechnologiesAdmin({
  technologies,
  categories,
}: {
  technologies: AdminTechnology[];
  categories: AdminSkillCategory[];
}) {
  const categoryOptions: CategoryOption[] = [
    { value: "", label: "Sans catégorie" },
    ...categories.map((category) => ({
      value: category.id,
      label: category.name,
    })),
  ];

  return (
    <div className="space-y-6">
      <AdminCard
        title="Ajouter une technologie"
        titleId="technology-new-title"
        description="Proposée immédiatement dans les versions de projets. Un même nom n'est saisi qu'une fois (majuscules et accents ignorés) ; décochez « Afficher dans les compétences » pour une technologie réservée aux projets."
      >
        <ActionForm action={createTechnologyAction} className="space-y-4">
          <TechnologyFields categoryOptions={categoryOptions} idPrefix="new-" />
          <SubmitButton>Ajouter la technologie</SubmitButton>
        </ActionForm>
      </AdminCard>

      {technologies.length === 0 ? (
        <EmptyList>Aucune technologie.</EmptyList>
      ) : (
        groupByCategory(technologies).map(([key, group]) => (
          <AdminCard
            key={key}
            title={`${group.name} (${group.items.length})`}
            titleId={`technologies-${key}-title`}
          >
            <ol className="space-y-3">
              {group.items.map((technology, index) => (
                <EditableRow
                  key={technology.id}
                  summary={
                    <p className="truncate text-sm">
                      {technology.name}
                      {technology._count.versions > 0 ? (
                        <span className="ml-2 text-xs text-muted-foreground">
                          utilisée par {technology._count.versions} version(s)
                        </span>
                      ) : null}
                      {technology.showInSkills ? null : <HiddenBadge />}
                    </p>
                  }
                  actions={
                    <>
                      <MoveButtons
                        id={technology.id}
                        label={technology.name}
                        action={moveTechnologyAction}
                        isFirst={index === 0}
                        isLast={index === group.items.length - 1}
                      />
                      <DeleteButton
                        id={technology.id}
                        label={technology.name}
                        action={deleteTechnologyAction}
                      />
                    </>
                  }
                >
                  <ActionForm
                    action={updateTechnologyAction}
                    className="space-y-4"
                  >
                    <input type="hidden" name="id" value={technology.id} />
                    <TechnologyFields
                      technology={technology}
                      categoryOptions={categoryOptions}
                      idPrefix={`${technology.id}-`}
                    />
                    <SubmitButton>Enregistrer</SubmitButton>
                  </ActionForm>
                </EditableRow>
              ))}
            </ol>
          </AdminCard>
        ))
      )}
    </div>
  );
}

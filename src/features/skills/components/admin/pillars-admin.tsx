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
  TextAreaField,
  TextField,
} from "@/components/admin/fields";
import {
  DeleteButton,
  MoveButtons,
} from "@/components/admin/list-item-actions";
import {
  createSkillPillarAction,
  deleteSkillPillarAction,
  moveSkillPillarAction,
  updateSkillPillarAction,
} from "@/features/skills/actions";
import { PILLAR_ICONS } from "@/features/skills/icons";
import type { AdminSkillPillar } from "@/features/skills/queries";

function PillarFields({
  pillar,
  idPrefix,
}: {
  pillar?: AdminSkillPillar;
  idPrefix: string;
}) {
  return (
    <>
      <TextField
        name="title"
        label="Titre"
        maxLength={80}
        idPrefix={idPrefix}
        defaultValue={pillar?.title}
        required
      />
      <TextAreaField
        name="description"
        label="Description"
        maxLength={300}
        rows={2}
        idPrefix={idPrefix}
        defaultValue={pillar?.description}
        required
      />
      <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
        <SelectField
          name="iconKey"
          label="Icône"
          options={PILLAR_ICONS}
          idPrefix={idPrefix}
          defaultValue={pillar?.iconKey ?? "code"}
        />
        <CheckboxField
          name="isVisible"
          label="Visible sur le site"
          idPrefix={idPrefix}
          defaultChecked={pillar?.isVisible ?? true}
        />
      </div>
    </>
  );
}

export function PillarsAdmin({ pillars }: { pillars: AdminSkillPillar[] }) {
  return (
    <AdminCard
      title="Piliers de compétences"
      titleId="pillars-title"
      description="Les cartes affichées en tête de la section Compétences (quatre dans la maquette)."
    >
      {pillars.length === 0 ? (
        <EmptyList>Aucun pilier.</EmptyList>
      ) : (
        <ol className="space-y-3">
          {pillars.map((pillar, index) => (
            <EditableRow
              key={pillar.id}
              summary={
                <p className="truncate text-sm">
                  {pillar.title}
                  {pillar.isVisible ? null : <HiddenBadge />}
                </p>
              }
              actions={
                <>
                  <MoveButtons
                    id={pillar.id}
                    label={pillar.title}
                    action={moveSkillPillarAction}
                    isFirst={index === 0}
                    isLast={index === pillars.length - 1}
                  />
                  <DeleteButton
                    id={pillar.id}
                    label={pillar.title}
                    action={deleteSkillPillarAction}
                  />
                </>
              }
            >
              <ActionForm
                action={updateSkillPillarAction}
                className="space-y-4"
              >
                <input type="hidden" name="id" value={pillar.id} />
                <PillarFields pillar={pillar} idPrefix={`${pillar.id}-`} />
                <SubmitButton>Enregistrer</SubmitButton>
              </ActionForm>
            </EditableRow>
          ))}
        </ol>
      )}

      <details className="mt-5 rounded-xl border border-dashed border-border p-4">
        <summary className="cursor-pointer text-sm font-medium">
          Ajouter un pilier
        </summary>
        <ActionForm action={createSkillPillarAction} className="mt-4 space-y-4">
          <PillarFields idPrefix="new-pillar-" />
          <SubmitButton>Ajouter le pilier</SubmitButton>
        </ActionForm>
      </details>
    </AdminCard>
  );
}

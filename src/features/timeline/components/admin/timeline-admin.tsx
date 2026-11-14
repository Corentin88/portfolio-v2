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
  createTimelineEntryAction,
  deleteTimelineEntryAction,
  moveTimelineEntryAction,
  updateTimelineEntryAction,
} from "@/features/timeline/actions";
import { MediaPickerField } from "@/features/media/components/admin/media-picker-field";
import { toPickerValue } from "@/features/media/picker";
import { TIMELINE_ICONS } from "@/features/timeline/icons";
import type { AdminTimelineEntry } from "@/features/timeline/queries";

function TimelineFields({
  entry,
  idPrefix,
}: {
  entry?: AdminTimelineEntry;
  idPrefix: string;
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
        <TextField
          name="periodLabel"
          label="Période"
          maxLength={40}
          idPrefix={idPrefix}
          defaultValue={entry?.periodLabel}
          required
        />
        <TextField
          name="title"
          label="Titre"
          maxLength={160}
          idPrefix={idPrefix}
          defaultValue={entry?.title}
          required
        />
      </div>
      <TextAreaField
        name="description"
        label="Description"
        maxLength={5_000}
        rows={3}
        idPrefix={idPrefix}
        defaultValue={entry?.description}
        required
      />
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr] sm:items-start">
        <MediaPickerField
          key={entry?.imageMediaId ?? "none"}
          name="imageMediaId"
          label="Illustration (médiathèque)"
          hint="Logo ou image : affichée en entier, sans rognage. PNG, WebP, JPEG ou AVIF (SVG refusé)."
          accept="IMAGE"
          initial={toPickerValue(entry?.imageMedia ?? null)}
          emptyLabel="Aucune (icône ci-contre)"
        />
        <SelectField
          name="iconKey"
          label="Icône (sans illustration)"
          options={TIMELINE_ICONS}
          idPrefix={idPrefix}
          defaultValue={entry?.iconKey ?? "code"}
        />
      </div>
      <div>
        <CheckboxField
          name="isVisible"
          label="Visible sur le site"
          idPrefix={idPrefix}
          defaultChecked={entry?.isVisible ?? true}
        />
      </div>
    </>
  );
}

export function TimelineAdmin({ entries }: { entries: AdminTimelineEntry[] }) {
  return (
    <div className="space-y-6">
      <AdminCard title="Ajouter une étape" titleId="timeline-new-title">
        <ActionForm action={createTimelineEntryAction} className="space-y-4">
          <TimelineFields idPrefix="new-" />
          <SubmitButton>Ajouter l&apos;étape</SubmitButton>
        </ActionForm>
      </AdminCard>

      <AdminCard
        title={`Étapes (${entries.length})`}
        titleId="timeline-list-title"
        description="Affichées dans cet ordre sur le site, de haut en bas."
      >
        {entries.length === 0 ? (
          <EmptyList>Aucune étape pour le moment.</EmptyList>
        ) : (
          <ol className="space-y-3">
            {entries.map((entry, index) => (
              <EditableRow
                key={entry.id}
                summary={
                  <p className="truncate text-sm">
                    <span className="font-mono text-amber-brand">
                      {entry.periodLabel}
                    </span>{" "}
                    — {entry.title}
                    {entry.isVisible ? null : <HiddenBadge />}
                  </p>
                }
                actions={
                  <>
                    <MoveButtons
                      id={entry.id}
                      label={entry.title}
                      action={moveTimelineEntryAction}
                      isFirst={index === 0}
                      isLast={index === entries.length - 1}
                    />
                    <DeleteButton
                      id={entry.id}
                      label={entry.title}
                      action={deleteTimelineEntryAction}
                    />
                  </>
                }
              >
                <ActionForm
                  action={updateTimelineEntryAction}
                  className="space-y-4"
                >
                  <input type="hidden" name="id" value={entry.id} />
                  <TimelineFields entry={entry} idPrefix={`${entry.id}-`} />
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

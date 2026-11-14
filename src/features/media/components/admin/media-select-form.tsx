import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { MediaPickerField } from "@/features/media/components/admin/media-picker-field";
import type { MediaAccept, PickerValue } from "@/features/media/picker";
import type { FormAction } from "@/lib/action-result";

type MediaSelectFormProps = {
  action: FormAction;
  /** Champs cachés identifiant la cible (projectId, versionId, slot…). */
  hidden: Record<string, string>;
  label: string;
  hint?: string;
  accept: MediaAccept;
  current: PickerValue | null;
  submitLabel?: string;
  emptyLabel?: string;
  shape?: "video" | "square";
};

/**
 * Choix d'un média (ou aucun) pour un emplacement donné, via le sélecteur
 * universel. Le champ est remonté à chaque nouvelle valeur enregistrée.
 */
export function MediaSelectForm({
  action,
  hidden,
  label,
  hint,
  accept,
  current,
  submitLabel = "Enregistrer",
  emptyLabel = "Aucun",
  shape = "video",
}: MediaSelectFormProps) {
  return (
    <ActionForm action={action} className="space-y-3">
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <MediaPickerField
        key={current?.id ?? "none"}
        name="mediaId"
        label={label}
        hint={hint}
        accept={accept}
        initial={current}
        emptyLabel={emptyLabel}
        shape={shape}
      />
      <SubmitButton variant="secondary">{submitLabel}</SubmitButton>
    </ActionForm>
  );
}

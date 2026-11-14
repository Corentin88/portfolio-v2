import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { TextField } from "@/components/admin/fields";
import { DeleteButton } from "@/components/admin/list-item-actions";
import {
  createFolderAction,
  deleteFolderAction,
  renameFolderAction,
} from "@/features/media/actions";
import { MAX_FOLDER_DEPTH } from "@/features/media/library";
import type { AdminMediaFolder } from "@/features/media/queries";

/**
 * Gestion du dossier ouvert : sous-dossier, renommage, suppression. Un dossier
 * ne se supprime que vide (ni sous-dossier ni média) : rien n'est effacé en cascade.
 */
export function MediaFolderAdmin({
  current,
  depth,
}: {
  /** Dossier ouvert, ou null à la racine / dans « Non classés ». */
  current: AdminMediaFolder | null;
  depth: number;
}) {
  const canNest = depth < MAX_FOLDER_DEPTH;
  const isEmpty =
    current !== null &&
    current._count.children === 0 &&
    current._count.media === 0;

  return (
    <div className="space-y-4">
      {canNest ? (
        <ActionForm action={createFolderAction} className="space-y-2">
          <input type="hidden" name="parentId" value={current?.id ?? ""} />
          <TextField
            name="name"
            label={
              current
                ? `Nouveau sous-dossier dans « ${current.name} »`
                : "Nouveau dossier"
            }
            maxLength={80}
            idPrefix="folder-new-"
            required
          />
          <SubmitButton variant="secondary">Créer le dossier</SubmitButton>
        </ActionForm>
      ) : (
        <p className="text-xs text-muted-foreground">
          Profondeur maximale atteinte ({MAX_FOLDER_DEPTH} niveaux) : pas de
          sous-dossier ici.
        </p>
      )}

      {current ? (
        <>
          <ActionForm action={renameFolderAction} className="space-y-2">
            <input type="hidden" name="id" value={current.id} />
            <TextField
              key={current.name}
              name="name"
              label="Renommer ce dossier"
              maxLength={80}
              idPrefix="folder-rename-"
              defaultValue={current.name}
              required
            />
            <SubmitButton variant="secondary">Renommer</SubmitButton>
          </ActionForm>
          <div className="space-y-1">
            {isEmpty ? (
              <DeleteButton
                id={current.id}
                label={current.name}
                action={deleteFolderAction}
                consequence="Le dossier est vide : seul le dossier est supprimé, aucun fichier."
              />
            ) : (
              <p className="text-xs text-muted-foreground">
                Suppression possible une fois le dossier vide (
                {current._count.children} sous-dossier(s),{" "}
                {current._count.media} média(s)). Aucun fichier n&apos;est
                jamais supprimé avec un dossier.
              </p>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

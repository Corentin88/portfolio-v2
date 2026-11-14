import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { AdminCard, EmptyList } from "@/components/admin/admin-ui";
import { TextField } from "@/components/admin/fields";
import {
  DeleteButton,
  MoveButtons,
} from "@/components/admin/list-item-actions";
import {
  moveVersionScreenshotAction,
  removeVersionScreenshotAction,
  setProjectCoverAction,
  setVersionCoverAction,
  updateVersionScreenshotAction,
} from "@/features/media/actions";
import { GalleryAddForm } from "@/features/media/components/admin/gallery-add-form";
import { MediaSelectForm } from "@/features/media/components/admin/media-select-form";
import { MediaThumb } from "@/features/media/components/admin/media-thumb";
import {
  resolveVersionCover,
  type VersionCoverSource,
} from "@/features/media/media-view";
import { toPickerValue } from "@/features/media/picker";
import type { AdminProjectMedia } from "@/features/media/queries";

const STATUS_LABEL = {
  DRAFT: "brouillon",
  PUBLISHED: "publié",
  ARCHIVED: "archivé",
} as const;

const COVER_SOURCE_LABEL: Record<VersionCoverSource, string> = {
  version: "sa couverture",
  screenshot: "sa première capture",
  project: "la couverture du projet",
  generated: "la couverture générée",
};

type Version = AdminProjectMedia["versions"][number];
type Screenshot = Version["screenshots"][number];

function ScreenshotItem({
  screenshot,
  isFirst,
  isLast,
}: {
  screenshot: Screenshot;
  isFirst: boolean;
  isLast: boolean;
}) {
  const label = screenshot.alt || screenshot.media.alt || "capture";
  return (
    <li className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-[8rem_1fr]">
      <MediaThumb media={screenshot.media} />
      <div className="space-y-2">
        <ActionForm
          action={updateVersionScreenshotAction}
          className="space-y-2"
        >
          <input type="hidden" name="id" value={screenshot.id} />
          <TextField
            name="alt"
            label="Texte alternatif propre à la galerie"
            hint={`Vide : « ${screenshot.media.alt} » (texte du média).`}
            idPrefix={`shot-${screenshot.id}-`}
            maxLength={300}
            defaultValue={screenshot.alt}
          />
          <TextField
            name="caption"
            label="Légende"
            idPrefix={`shot-${screenshot.id}-`}
            maxLength={200}
            defaultValue={screenshot.caption}
          />
          <SubmitButton variant="secondary">Enregistrer</SubmitButton>
        </ActionForm>
        <div className="flex flex-wrap gap-2">
          <MoveButtons
            id={screenshot.id}
            label={label}
            action={moveVersionScreenshotAction}
            isFirst={isFirst}
            isLast={isLast}
          />
          <DeleteButton
            id={screenshot.id}
            label={label}
            action={removeVersionScreenshotAction}
            consequence="L'image reste disponible dans la bibliothèque."
          />
        </div>
      </div>
    </li>
  );
}

/** Couverture et galerie d'une version (réutilisé par l'édition des projets). */
export function VersionMedia({
  version,
  projectCover,
  showHeading = true,
}: {
  version: Version;
  projectCover: AdminProjectMedia["coverMedia"];
  showHeading?: boolean;
}) {
  const effective = resolveVersionCover({
    versionCover: version.coverMedia,
    screenshots: version.screenshots,
    projectCover,
  });

  return (
    <div className="space-y-4 rounded-xl border border-border bg-background/60 p-4">
      {showHeading ? (
        <h3 className="font-medium">
          {version.label}{" "}
          <span className="font-mono text-xs text-muted-foreground">
            ({STATUS_LABEL[version.status]})
          </span>
        </h3>
      ) : null}
      <div className="space-y-2">
        <MediaSelectForm
          action={setVersionCoverAction}
          hidden={{ versionId: version.id }}
          label="Couverture de la version"
          accept="IMAGE"
          current={toPickerValue(version.coverMedia)}
          emptyLabel="Aucune (image suivante de la règle)"
        />
        <p className="text-xs text-muted-foreground">
          Image affichée pour cette version :{" "}
          {COVER_SOURCE_LABEL[effective.source]}.
        </p>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-medium">
          Galerie ({version.screenshots.length})
        </h4>
        {version.screenshots.length === 0 ? (
          <EmptyList>Aucune capture pour cette version.</EmptyList>
        ) : (
          <ol className="space-y-2">
            {version.screenshots.map((screenshot, index) => (
              <ScreenshotItem
                key={screenshot.id}
                screenshot={screenshot}
                isFirst={index === 0}
                isLast={index === version.screenshots.length - 1}
              />
            ))}
          </ol>
        )}
        <GalleryAddForm
          key={version.screenshots.map((shot) => shot.media.id).join(",")}
          versionId={version.id}
          existingIds={version.screenshots.map((shot) => shot.media.id)}
        />
      </div>
    </div>
  );
}

export function ProjectMediaAdmin({
  projects,
}: {
  projects: AdminProjectMedia[];
}) {
  if (projects.length === 0) {
    return (
      <EmptyList>
        Aucun projet pour le moment : créez-en un depuis la page Projets.
      </EmptyList>
    );
  }

  return (
    <div className="space-y-6">
      {projects.map((project) => (
        <AdminCard
          key={project.id}
          title={`${project.title} (${STATUS_LABEL[project.status]})`}
          titleId={`project-media-${project.id}`}
        >
          <div className="space-y-5">
            <MediaSelectForm
              action={setProjectCoverAction}
              hidden={{ projectId: project.id }}
              label="Couverture du projet (cartes du catalogue)"
              accept="IMAGE"
              current={toPickerValue(project.coverMedia)}
              emptyLabel="Aucune (couverture générée)"
            />
            {project.versions.length === 0 ? (
              <EmptyList>Ce projet n&apos;a pas encore de version.</EmptyList>
            ) : (
              project.versions.map((version) => (
                <VersionMedia
                  key={version.id}
                  version={version}
                  projectCover={project.coverMedia}
                />
              ))
            )}
          </div>
        </AdminCard>
      ))}
    </div>
  );
}

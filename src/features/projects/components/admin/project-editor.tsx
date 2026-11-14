import Link from "next/link";
import { Trash2 } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { AdminCard, EmptyList } from "@/components/admin/admin-ui";
import {
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/admin/fields";
import { setProjectCoverAction } from "@/features/media/actions";
import { MediaSelectForm } from "@/features/media/components/admin/media-select-form";
import { toPickerValue } from "@/features/media/picker";
import {
  createVersionAction,
  deleteProjectAction,
  updateProjectAction,
} from "@/features/projects/actions";
import { ProjectFields } from "@/features/projects/components/admin/project-fields";
import { ProjectStatusBadge } from "@/features/projects/components/admin/project-status-badge";
import { VersionEditor } from "@/features/projects/components/admin/version-editor";
import type {
  AdminProject,
  ProjectFormOptions,
} from "@/features/projects/queries";
import { STATUS_OPTIONS } from "@/features/projects/schemas";

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

const linkClass =
  "text-link hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

function publicationSummary(project: AdminProject): string {
  const published = project.versions.filter(
    (version) => version.status === "PUBLISHED",
  ).length;
  if (project.status !== "PUBLISHED") {
    return "Masqué sur le site : le projet n'est pas publié.";
  }
  return published > 0
    ? `Visible sur le site avec ${published} version(s) publiée(s).`
    : "Masqué sur le site : aucune version publiée.";
}

function NewVersionForm({ project }: { project: AdminProject }) {
  const next = project.versions.length + 1;
  return (
    <ActionForm
      action={createVersionAction}
      className="space-y-4 rounded-xl border border-dashed border-border p-4"
    >
      <input type="hidden" name="projectId" value={project.id} />
      <p className="text-sm font-medium">Ajouter une version</p>
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          name="label"
          label="Libellé"
          maxLength={60}
          idPrefix="vnew-"
          defaultValue={`V${next}`}
          required
        />
        <TextField
          name="slug"
          label="Slug"
          maxLength={20}
          idPrefix="vnew-"
          defaultValue={`v${next}`}
          required
        />
        <TextField
          name="periodLabel"
          label="Période (facultative)"
          maxLength={80}
          idPrefix="vnew-"
        />
      </div>
      <TextField
        name="releasedAt"
        label="Date de sortie (facultative)"
        type="date"
        maxLength={10}
        idPrefix="vnew-"
      />
      <TextAreaField
        name="description"
        label="Description"
        maxLength={5000}
        rows={4}
        idPrefix="vnew-"
        required
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          name="sourceUrl"
          label="Code source (facultatif)"
          type="url"
          maxLength={500}
          idPrefix="vnew-"
        />
        <TextField
          name="demoUrl"
          label="Démo en ligne (facultative)"
          type="url"
          maxLength={500}
          idPrefix="vnew-"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Créée en brouillon : complétez ensuite ses technologies, points clés et
        captures, puis publiez-la.
      </p>
      <SubmitButton variant="secondary">Ajouter la version</SubmitButton>
    </ActionForm>
  );
}

export function ProjectEditor({
  project,
  options,
  isPublic,
}: {
  project: AdminProject;
  options: ProjectFormOptions;
  /** Fiche réellement visible (projet et au moins une version publiés). */
  isPublic: boolean;
}) {
  return (
    <div className="space-y-6">
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <Link href="/admin/projets" className={linkClass}>
          ← Tous les projets
        </Link>
        {isPublic ? (
          <Link
            href={`/projets/${project.slug}`}
            className={linkClass}
            target="_blank"
          >
            Voir la fiche publique ↗
          </Link>
        ) : null}
      </p>

      <AdminCard
        title="Informations et publication"
        titleId="project-info-title"
        description={
          <span className="flex flex-wrap items-center gap-2">
            <ProjectStatusBadge status={project.status} />
            {publicationSummary(project)}
            {project.publishedAt
              ? ` Première publication : ${dateFormat.format(project.publishedAt)}.`
              : null}
          </span>
        }
      >
        <ActionForm action={updateProjectAction} className="space-y-4">
          <input type="hidden" name="id" value={project.id} />
          <SelectField
            name="status"
            label="Statut du projet"
            hint="Publier exige au moins une version publiée."
            idPrefix="p-"
            defaultValue={project.status}
            options={STATUS_OPTIONS}
          />
          <ProjectFields
            idPrefix="p-"
            categories={options.categories}
            values={project}
          />
          <SubmitButton>Enregistrer le projet</SubmitButton>
        </ActionForm>
      </AdminCard>

      <AdminCard
        title="Couverture du projet"
        titleId="project-cover-title"
        description="Image des cartes du catalogue. Sans couverture, une couverture générée est affichée."
      >
        <MediaSelectForm
          action={setProjectCoverAction}
          hidden={{ projectId: project.id }}
          label="Image de couverture"
          hint="Le sélecteur permet aussi d'importer une image dans le dossier ouvert."
          accept="IMAGE"
          current={toPickerValue(project.coverMedia)}
          emptyLabel="Aucune (couverture générée)"
        />
      </AdminCard>

      <AdminCard
        title={`Versions (${project.versions.length})`}
        titleId="project-versions-title"
        description="L'ordre va de la plus ancienne à la plus récente ; la dernière version publiée s'affiche par défaut et la comparaison oppose la première à la dernière."
      >
        <div className="space-y-4">
          {project.versions.length === 0 ? (
            <EmptyList>
              Aucune version : un projet doit avoir au moins une version publiée
              pour apparaître sur le site.
            </EmptyList>
          ) : (
            <ol className="space-y-4">
              {project.versions.map((version, index) => (
                <VersionEditor
                  key={version.id}
                  version={version}
                  project={project}
                  isFirst={index === 0}
                  isLast={index === project.versions.length - 1}
                  technologies={options.technologies}
                />
              ))}
            </ol>
          )}
          <NewVersionForm project={project} />
        </div>
      </AdminCard>

      <AdminCard
        title="Suppression"
        titleId="project-delete-title"
        description="Supprime le projet et toutes ses versions. Les images restent dans la bibliothèque de médias."
      >
        {project.status === "PUBLISHED" ? (
          <p className="text-sm text-muted-foreground">
            Un projet publié ne peut pas être supprimé : passez-le d&apos;abord
            en brouillon ou archivez-le.
          </p>
        ) : (
          <ActionForm
            action={deleteProjectAction}
            confirm={{
              title: `Supprimer « ${project.title} » ?`,
              message: `Le projet et ses ${project.versions.length} version(s) seront supprimés. Cette action est définitive.`,
            }}
          >
            <input type="hidden" name="id" value={project.id} />
            <input type="hidden" name="redirectTo" value="list" />
            <SubmitButton variant="danger">
              <Trash2 className="size-4" aria-hidden="true" />
              Supprimer le projet
            </SubmitButton>
          </ActionForm>
        )}
      </AdminCard>
    </div>
  );
}

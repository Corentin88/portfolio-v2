import type { ReactNode } from "react";
import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { EmptyList } from "@/components/admin/admin-ui";
import {
  CheckboxGroupField,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/admin/fields";
import {
  DeleteButton,
  MoveButtons,
} from "@/components/admin/list-item-actions";
import { VersionMedia } from "@/features/media/components/admin/project-media-admin";
import {
  addChallengeAction,
  deleteChallengeAction,
  deleteVersionAction,
  moveChallengeAction,
  moveVersionAction,
  updateChallengeAction,
  updateVersionAction,
} from "@/features/projects/actions";
import { ProjectStatusBadge } from "@/features/projects/components/admin/project-status-badge";
import type {
  AdminProject,
  AdminProjectVersion,
  ProjectFormOptions,
} from "@/features/projects/queries";
import { STATUS_OPTIONS } from "@/features/projects/schemas";

/** Technologies cochées d'abord, dans l'ordre enregistré, puis les autres. */
function technologyOptions(
  version: AdminProjectVersion,
  technologies: ProjectFormOptions["technologies"],
) {
  const selected = version.technologies.map(({ technologyId }) => technologyId);
  const byId = new Map(technologies.map((tech) => [tech.id, tech]));
  const ordered = [
    ...selected.flatMap((id) => {
      const tech = byId.get(id);
      return tech ? [tech] : [];
    }),
    ...technologies.filter((tech) => !selected.includes(tech.id)),
  ];
  return {
    selected,
    options: ordered.map((tech) => ({ value: tech.id, label: tech.name })),
  };
}

function highlightLines(
  version: AdminProjectVersion,
  kind: "FEATURE" | "IMPROVEMENT",
): string {
  return version.highlights
    .filter((highlight) => highlight.kind === kind)
    .map((highlight) => highlight.text)
    .join("\n");
}

function Fold({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group rounded-lg border border-border">
      <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-link group-open:border-b group-open:border-border hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
        {title}
      </summary>
      <div className="space-y-4 p-3">{children}</div>
    </details>
  );
}

function VersionForm({
  version,
  technologies,
}: {
  version: AdminProjectVersion;
  technologies: ProjectFormOptions["technologies"];
}) {
  const prefix = `v-${version.id}-`;
  const tech = technologyOptions(version, technologies);

  return (
    <ActionForm action={updateVersionAction} className="space-y-4">
      <input type="hidden" name="id" value={version.id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          name="label"
          label="Libellé"
          hint="Ex. V2, Refonte 2025."
          maxLength={60}
          idPrefix={prefix}
          defaultValue={version.label}
          required
        />
        <TextField
          name="slug"
          label="Slug (?version=…)"
          hint="Unique dans le projet, ex. v2."
          maxLength={20}
          idPrefix={prefix}
          defaultValue={version.slug}
          required
        />
        <TextField
          name="periodLabel"
          label="Période (facultative)"
          hint="Ex. 2023 – 2024. Vide : mois de sortie."
          maxLength={80}
          idPrefix={prefix}
          defaultValue={version.periodLabel}
        />
        <TextField
          name="releasedAt"
          label="Date de sortie (facultative)"
          type="date"
          maxLength={10}
          idPrefix={prefix}
          defaultValue={version.releasedAt?.toISOString().slice(0, 10)}
        />
        <SelectField
          name="status"
          label="Statut"
          hint="Seules les versions publiées sont visibles."
          idPrefix={prefix}
          defaultValue={version.status}
          options={STATUS_OPTIONS}
        />
      </div>
      <TextAreaField
        name="description"
        label="Description (« À propos »)"
        maxLength={5000}
        rows={5}
        idPrefix={prefix}
        defaultValue={version.description}
        required
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          name="sourceUrl"
          label="Code source (facultatif)"
          type="url"
          hint="Adresse https://…"
          maxLength={500}
          idPrefix={prefix}
          defaultValue={version.sourceUrl}
        />
        <TextField
          name="demoUrl"
          label="Démo en ligne (facultative)"
          type="url"
          hint="Adresse https://…"
          maxLength={500}
          idPrefix={prefix}
          defaultValue={version.demoUrl}
        />
      </div>
      <CheckboxGroupField
        name="technologyIds"
        label="Technologies"
        hint={
          <>
            Affichées dans cet ordre ; une technologie ajoutée se place à la
            fin. Technologie absente ?{" "}
            <Link
              href="/admin/technologies#technology-new-title"
              target="_blank"
              className="text-link hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              Créer une technologie
              <span className="sr-only"> (nouvel onglet)</span> ↗
            </Link>{" "}
            puis rechargez cette page.
          </>
        }
        idPrefix={prefix}
        options={tech.options}
        defaultValues={tech.selected}
      />
      <TextAreaField
        name="features"
        label="Fonctionnalités clés (une par ligne)"
        maxLength={10000}
        rows={4}
        idPrefix={prefix}
        defaultValue={highlightLines(version, "FEATURE")}
      />
      <TextAreaField
        name="improvements"
        label="Ce qui change dans cette version (une par ligne)"
        hint="Laissez vide pour une première version."
        maxLength={10000}
        rows={3}
        idPrefix={prefix}
        defaultValue={highlightLines(version, "IMPROVEMENT")}
      />
      <SubmitButton>Enregistrer la version</SubmitButton>
    </ActionForm>
  );
}

function ChallengesEditor({ version }: { version: AdminProjectVersion }) {
  const { challenges } = version;
  return (
    <div className="space-y-3">
      {challenges.length === 0 ? (
        <EmptyList>Aucune difficulté renseignée.</EmptyList>
      ) : (
        <ol className="space-y-3">
          {challenges.map((challenge, index) => {
            const prefix = `c-${challenge.id}-`;
            const label = `difficulté ${index + 1}`;
            return (
              <li
                key={challenge.id}
                className="space-y-3 rounded-lg border border-border p-3"
              >
                <ActionForm
                  action={updateChallengeAction}
                  className="space-y-3"
                >
                  <input type="hidden" name="id" value={challenge.id} />
                  <TextAreaField
                    name="problem"
                    label="Difficulté"
                    maxLength={2000}
                    rows={2}
                    idPrefix={prefix}
                    defaultValue={challenge.problem}
                    required
                  />
                  <TextAreaField
                    name="solution"
                    label="Solution"
                    maxLength={2000}
                    rows={2}
                    idPrefix={prefix}
                    defaultValue={challenge.solution}
                    required
                  />
                  <SubmitButton variant="secondary">Enregistrer</SubmitButton>
                </ActionForm>
                <div className="flex flex-wrap gap-2">
                  <MoveButtons
                    id={challenge.id}
                    label={label}
                    action={moveChallengeAction}
                    isFirst={index === 0}
                    isLast={index === challenges.length - 1}
                  />
                  <DeleteButton
                    id={challenge.id}
                    label={label}
                    action={deleteChallengeAction}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <ActionForm
        action={addChallengeAction}
        className="space-y-3 rounded-lg border border-dashed border-border p-3"
      >
        <input type="hidden" name="versionId" value={version.id} />
        <TextAreaField
          name="problem"
          label="Nouvelle difficulté"
          maxLength={2000}
          rows={2}
          idPrefix={`c-new-${version.id}-`}
          required
        />
        <TextAreaField
          name="solution"
          label="Solution apportée"
          maxLength={2000}
          rows={2}
          idPrefix={`c-new-${version.id}-`}
          required
        />
        <SubmitButton variant="secondary">Ajouter</SubmitButton>
      </ActionForm>
    </div>
  );
}

export function VersionEditor({
  version,
  project,
  isFirst,
  isLast,
  technologies,
}: {
  version: AdminProjectVersion;
  project: Pick<AdminProject, "coverMedia">;
  isFirst: boolean;
  isLast: boolean;
  technologies: ProjectFormOptions["technologies"];
}) {
  return (
    <li className="space-y-3 rounded-xl border border-border bg-background/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex flex-wrap items-center gap-2 font-medium">
          {version.label}
          <span className="font-mono text-xs text-muted-foreground">
            ?version={version.slug}
          </span>
          <ProjectStatusBadge status={version.status} />
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <MoveButtons
            id={version.id}
            label={version.label}
            action={moveVersionAction}
            isFirst={isFirst}
            isLast={isLast}
          />
          <DeleteButton
            id={version.id}
            label={version.label}
            action={deleteVersionAction}
            consequence="Sa description, ses points clés, difficultés et liens de galerie seront supprimés définitivement. Les images restent dans la bibliothèque de médias."
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {version.screenshots.length} capture(s) · {version.challenges.length}{" "}
        difficulté(s) · {version.technologies.length} technologie(s)
      </p>
      <Fold title="Contenu, statut, liens et technologies">
        <VersionForm version={version} technologies={technologies} />
      </Fold>
      <Fold title={`Difficultés et solutions (${version.challenges.length})`}>
        <ChallengesEditor version={version} />
      </Fold>
      <Fold title={`Couverture et captures (${version.screenshots.length})`}>
        <VersionMedia
          version={version}
          projectCover={project.coverMedia}
          showHeading={false}
        />
      </Fold>
    </li>
  );
}

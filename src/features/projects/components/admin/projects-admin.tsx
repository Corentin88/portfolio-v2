import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { AdminCard, EmptyList } from "@/components/admin/admin-ui";
import {
  DeleteButton,
  MoveButtons,
} from "@/components/admin/list-item-actions";
import {
  createProjectAction,
  deleteProjectAction,
  moveProjectAction,
} from "@/features/projects/actions";
import { ProjectFields } from "@/features/projects/components/admin/project-fields";
import { ProjectStatusBadge } from "@/features/projects/components/admin/project-status-badge";
import type {
  AdminProjectListItem,
  ProjectFormOptions,
} from "@/features/projects/queries";

const linkClass =
  "text-link hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

/** Visible publiquement : projet publié avec au moins une version publiée. */
function visibility(project: AdminProjectListItem): string {
  const published = project.versions.filter(
    (version) => version.status === "PUBLISHED",
  ).length;
  const versions = `${project.versions.length} version(s), ${published} publiée(s)`;
  if (project.status !== "PUBLISHED") return `${versions} · masqué`;
  return published > 0 ? `${versions} · visible` : `${versions} · masqué`;
}

export function ProjectsAdmin({
  projects,
  categories,
}: {
  projects: AdminProjectListItem[];
  categories: ProjectFormOptions["categories"];
}) {
  return (
    <div className="space-y-6">
      <AdminCard
        title={`Projets (${projects.length})`}
        titleId="project-list-title"
        description="L'ordre est celui du catalogue public. Seuls les projets publiés ayant au moins une version publiée sont visibles."
      >
        {projects.length === 0 ? (
          <EmptyList>
            Aucun projet. Créez le premier ci-dessous : il restera en brouillon
            tant que vous ne l&apos;aurez pas publié.
          </EmptyList>
        ) : (
          <ol className="space-y-3">
            {projects.map((project, index) => (
              <li
                key={project.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background/60 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm">
                    <Link
                      href={`/admin/projets/${project.id}`}
                      className={`${linkClass} font-medium`}
                    >
                      {project.title}
                    </Link>
                    <ProjectStatusBadge status={project.status} />
                    {project.featured ? (
                      <span className="font-mono text-[11px] text-amber-brand">
                        mis en avant
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                    /{project.slug} · {project.category.name} ·{" "}
                    {visibility(project)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/projets/${project.id}`}
                    className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    Modifier
                  </Link>
                  <MoveButtons
                    id={project.id}
                    label={project.title}
                    action={moveProjectAction}
                    isFirst={index === 0}
                    isLast={index === projects.length - 1}
                  />
                  {project.status === "PUBLISHED" ? null : (
                    <DeleteButton
                      id={project.id}
                      label={project.title}
                      action={deleteProjectAction}
                      consequence={`Ses ${project.versions.length} version(s), points clés et liens de galerie seront supprimés définitivement. Les images restent dans la bibliothèque de médias.`}
                    />
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </AdminCard>

      <AdminCard
        title="Nouveau projet"
        titleId="project-new-title"
        description="Créé en brouillon. Vous ajouterez ensuite ses versions, technologies et captures."
      >
        {categories.length === 0 ? (
          <EmptyList>
            Créez d&apos;abord une{" "}
            <Link href="/admin/categories" className={linkClass}>
              catégorie de projets
            </Link>
            .
          </EmptyList>
        ) : (
          <ActionForm action={createProjectAction} className="space-y-4">
            <ProjectFields idPrefix="new-" categories={categories} />
            <SubmitButton>Créer le projet</SubmitButton>
          </ActionForm>
        )}
      </AdminCard>
    </div>
  );
}

import Link from "next/link";
import { ArrowUpRight, GitBranch } from "lucide-react";
import { ProjectBadge } from "@/features/projects/components/project-badge";
import {
  ProjectCover,
  ProjectIconMark,
} from "@/features/projects/components/project-cover";
import type { ProjectCardData } from "@/features/projects/public-view";
import { cn } from "@/lib/utils";

export function ProjectCard({ project }: { project: ProjectCardData }) {
  const href = `/projets/${project.slug}`;
  // La couverture générée porte un onglet de fichier en haut : les pastilles passent dessous.
  const overlayTop = project.coverImage ? "top-3" : "top-12";

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 focus-within:border-amber-brand/50 hover:-translate-y-1.5 hover:border-amber-brand/50 hover:shadow-2xl hover:shadow-royal/25">
      <div className="relative">
        <ProjectCover project={project} />
        {project.badgeLabel ? (
          <ProjectBadge
            label={project.badgeLabel}
            tone={project.badgeTone}
            placement="overlay"
            className={cn("absolute left-4", overlayTop)}
          />
        ) : null}
        {project.versionCount > 1 ? (
          <span
            className={cn(
              "absolute right-4 inline-flex items-center gap-1.5 rounded-full bg-panel-dark/85 px-3 py-1 font-mono text-[11px] text-sky-soft-const backdrop-blur-sm",
              overlayTop,
            )}
          >
            <GitBranch className="size-3.5" aria-hidden="true" />
            {project.versionCount} versions
          </span>
        ) : null}
        {/* Survol : raccourci visuel vers la fiche. Hors tabulation, le lien du bas
            portant le même nom accessible. */}
        <Link
          href={href}
          scroll={false}
          tabIndex={-1}
          aria-hidden="true"
          className="absolute inset-0 z-[1] flex flex-col items-center justify-center gap-2 bg-navy-deep/80 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-100"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-vivid px-5 py-2.5 font-semibold text-amber-ink shadow-lg transition-transform duration-300 group-hover:scale-105">
            Découvrir le projet
            <ArrowUpRight className="size-4" />
          </span>
          {project.context ? (
            <span className="font-mono text-[11px] tracking-widest text-sky-soft/70 uppercase">
              {project.context}
            </span>
          ) : null}
        </Link>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-lg font-semibold text-foreground transition-colors group-hover:text-amber-brand">
            {project.title}
          </h3>
          <ProjectIconMark
            iconKey={project.iconKey}
            iconImage={project.iconImage}
            className={cn(
              "mt-0.5 shrink-0",
              project.iconImage
                ? "size-7 rounded-md"
                : "size-5 text-muted-foreground/70",
            )}
          />
        </div>
        <p className="mt-1 font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
          {project.category.name}
          {project.context ? ` · ${project.context}` : null}
        </p>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-sky-soft">
          {project.summary}
        </p>
        {project.technologies.length > 0 ? (
          <ul
            aria-label={`Technologies de ${project.title} (${project.latestVersionLabel})`}
            className="mt-4 flex flex-wrap gap-1.5"
          >
            {project.technologies.map((technology) => (
              <li
                key={technology}
                className="rounded-full border border-foreground/15 bg-foreground/5 px-2.5 py-0.5 font-mono text-[11px] text-sky-soft/90"
              >
                {technology}
              </li>
            ))}
          </ul>
        ) : null}
        <Link
          href={href}
          scroll={false}
          aria-label={`Découvrir le projet ${project.title}`}
          className="mt-4 inline-flex items-center gap-1.5 self-start rounded-full py-1 font-mono text-[13px] font-medium text-amber-brand transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-amber-brand focus-visible:outline-none"
        >
          Découvrir le projet
          <ArrowUpRight
            className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            aria-hidden="true"
          />
        </Link>
      </div>
    </article>
  );
}

"use client";

import { useState } from "react";
import { FolderOpen } from "lucide-react";
import { Reveal } from "@/components/shared/reveal";
import { ProjectCard } from "@/features/projects/components/project-card";
import type {
  ProjectCardData,
  ProjectCategoryFilter,
} from "@/features/projects/public-view";
import { cn } from "@/lib/utils";

const ALL = "all";

function filterClass(active: boolean) {
  return cn(
    "rounded-full px-4 py-1.5 font-mono text-xs font-medium transition-all focus-visible:ring-2 focus-visible:ring-amber-brand focus-visible:outline-none sm:text-[13px]",
    active
      ? "bg-amber-vivid text-amber-ink shadow-lg shadow-amber-vivid/20"
      : "border border-border bg-foreground/5 text-sky-soft hover:border-amber-brand/50 hover:text-amber-brand",
  );
}

type ProjectCatalogProps = {
  projects: ProjectCardData[];
  categories: ProjectCategoryFilter[];
};

/** Grille filtrable : le filtrage se fait côté navigateur sur la liste déjà chargée. */
export function ProjectCatalog({ projects, categories }: ProjectCatalogProps) {
  const [active, setActive] = useState(ALL);
  const visible =
    active === ALL
      ? projects
      : projects.filter((project) => project.category.slug === active);

  return (
    <>
      {categories.length > 1 ? (
        <Reveal className="mt-10">
          <div
            role="group"
            aria-label="Filtrer les projets par catégorie"
            className="flex flex-wrap items-center justify-center gap-2"
          >
            <button
              type="button"
              aria-pressed={active === ALL}
              onClick={() => setActive(ALL)}
              className={filterClass(active === ALL)}
            >
              Tous ({projects.length})
            </button>
            {categories.map((category) => (
              <button
                key={category.slug}
                type="button"
                aria-pressed={active === category.slug}
                onClick={() => setActive(category.slug)}
                className={filterClass(active === category.slug)}
              >
                {category.name} ({category.count})
              </button>
            ))}
          </div>
        </Reveal>
      ) : null}

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((project, index) => (
          <Reveal
            key={project.id}
            delay={(index % 3) * 100}
            className={cn(project.featured && "sm:col-span-2")}
          >
            <ProjectCard project={project} />
          </Reveal>
        ))}
        {visible.length === 0 ? <EmptyProjects /> : null}
      </div>
    </>
  );
}

export function EmptyProjects() {
  return (
    <div className="col-span-full flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-10 text-center">
      <FolderOpen
        className="size-8 text-muted-foreground/60"
        aria-hidden="true"
      />
      <p className="text-sm text-muted-foreground">
        Les projets arrivent bientôt.
      </p>
    </div>
  );
}

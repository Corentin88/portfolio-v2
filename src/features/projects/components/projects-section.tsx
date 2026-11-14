import { SectionHeading } from "@/components/shared/section-heading";
import { ProjectCatalog } from "@/features/projects/components/project-catalog";
import type { PublicProjectCatalog } from "@/features/projects/queries";

export function ProjectsSection({
  catalog,
}: {
  catalog: PublicProjectCatalog;
}) {
  return (
    <section
      id="projets"
      aria-labelledby="projets-title"
      className="relative overflow-hidden bg-navy-deep py-24 sm:py-28"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-24 -left-20 hidden font-mono text-[200px] leading-none font-bold text-foreground/[0.03] select-none lg:block"
      >
        {"{}"}
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          kicker="// projets"
          title="Découvrez mes projets !"
          titleId="projets-title"
          description="Chaque projet est une occasion d'apprendre, de livrer et de progresser."
        />
        <ProjectCatalog
          projects={catalog.projects}
          categories={catalog.categories}
        />
      </div>
    </section>
  );
}

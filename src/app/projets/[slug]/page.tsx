import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft } from "lucide-react";
import { PublicFooter } from "@/components/layout/public-footer";
import { PublicHeader, type NavLink } from "@/components/layout/public-header";
import { ProjectDetail } from "@/features/projects/components/project-detail";
import { getPublicProject } from "@/features/projects/queries";
import { getPublicSiteSettings } from "@/features/site-settings/queries";
import { resolveSiteUrl } from "@/lib/site-url";

const NAV_LINKS: NavLink[] = [
  { href: "/#presentation", label: "Présentation" },
  { href: "/#competences", label: "Compétences" },
  { href: "/#projets", label: "Projets" },
  { href: "/#parcours", label: "Parcours" },
];

type ProjectPageProps = PageProps<"/projets/[slug]">;

function versionParam(value: string | string[] | undefined): string | null {
  return typeof value === "string" ? value : null;
}

export async function generateMetadata({
  params,
}: ProjectPageProps): Promise<Metadata> {
  await connection();
  const { slug } = await params;
  const project = await getPublicProject(slug);
  if (!project) notFound();
  const title = project.seoTitle ?? project.title;
  const description = project.seoDescription ?? project.summary;
  const image = project.coverImage;
  const canonical = `/projets/${project.slug}`;
  return {
    metadataBase: (await resolveSiteUrl()) ?? undefined,
    title,
    description,
    alternates: { canonical },
    openGraph: {
      url: canonical,
      title,
      description,
      type: "article",
      locale: "fr_FR",
      images: image
        ? [
            {
              url: image.src,
              width: image.width,
              height: image.height,
              alt: image.alt,
            },
          ]
        : undefined,
    },
  };
}

export default function ProjectPage(props: ProjectPageProps) {
  return (
    <Suspense
      fallback={
        <div
          aria-busy="true"
          className="flex min-h-svh items-center justify-center bg-navy-deep font-mono text-sm text-sky-soft"
        >
          Chargement…
        </div>
      }
    >
      <ProjectPageContent {...props} />
    </Suspense>
  );
}

async function ProjectPageContent({ params, searchParams }: ProjectPageProps) {
  // Rendu à la requête (aucune base au build) ; lectures en cache « use cache ».
  await connection();
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const [project, settings] = await Promise.all([
    getPublicProject(slug),
    getPublicSiteSettings(),
  ]);
  if (!project) notFound();

  return (
    <div className="flex min-h-svh flex-col bg-navy-deep">
      <a
        href="#contenu"
        className="sr-only z-[60] rounded-md bg-amber-vivid px-4 py-2 font-medium text-amber-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Aller au contenu
      </a>
      <PublicHeader
        links={NAV_LINKS}
        brandHref="/"
        alwaysSolid
        contactHref={settings?.contactEmail ? "/#contact" : null}
      />
      <main id="contenu" className="flex-1 px-4 pt-24 pb-16 sm:px-6 lg:pt-28">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/#projets"
            className="inline-flex items-center gap-1.5 rounded-full py-1 font-mono text-[13px] text-sky-soft transition-colors hover:text-amber-brand focus-visible:ring-2 focus-visible:ring-amber-brand focus-visible:outline-none"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Tous les projets
          </Link>
          <article className="mt-4 overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-royal/10">
            <ProjectDetail
              project={project}
              initialVersion={versionParam(query.version)}
              titleId="project-title"
            />
          </article>
        </div>
      </main>
      <PublicFooter
        githubUrl={settings?.githubUrl ?? null}
        linkedinUrl={settings?.linkedinUrl ?? null}
      />
    </div>
  );
}

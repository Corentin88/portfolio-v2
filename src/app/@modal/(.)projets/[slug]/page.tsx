import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ProjectDialog } from "@/features/projects/components/project-dialog";
import { getPublicProject } from "@/features/projects/queries";

/**
 * Fiche ouverte depuis le catalogue (navigation côté client) : affichée en
 * modale au-dessus de l'accueil. Un chargement direct de /projets/[slug] rend
 * la page complète.
 */
export default function InterceptedProjectPage(
  props: PageProps<"/projets/[slug]">,
) {
  return (
    <Suspense fallback={null}>
      <InterceptedProject {...props} />
    </Suspense>
  );
}

async function InterceptedProject({
  params,
  searchParams,
}: PageProps<"/projets/[slug]">) {
  await connection();
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const project = await getPublicProject(slug);
  if (!project) notFound();
  return (
    <ProjectDialog
      project={project}
      initialVersion={typeof query.version === "string" ? query.version : null}
    />
  );
}

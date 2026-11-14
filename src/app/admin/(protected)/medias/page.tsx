import Link from "next/link";
import {
  AdminCard,
  AdminPageHeader,
  EmptyList,
} from "@/components/admin/admin-ui";
import { requireAdmin } from "@/features/auth/require-admin";
import { setSiteMediaAction } from "@/features/media/actions";
import { MediaFolderAdmin } from "@/features/media/components/admin/media-folder-admin";
import {
  MediaBreadcrumb,
  MediaFilters,
  MediaFolderNav,
  MediaGrid,
} from "@/features/media/components/admin/media-library";
import { MediaSelectForm } from "@/features/media/components/admin/media-select-form";
import { MediaUploadForm } from "@/features/media/components/admin/media-upload-form";
import {
  folderPath,
  parseMediaQuery,
  UNCLASSIFIED,
} from "@/features/media/library";
import { toPickerValue } from "@/features/media/picker";
import {
  countUnclassifiedMedia,
  getAdminSiteMedia,
  listMediaFolders,
  searchAdminMedia,
} from "@/features/media/queries";

export default async function AdminMediaPage({
  searchParams,
}: PageProps<"/admin/medias">) {
  await requireAdmin();
  const query = parseMediaQuery(await searchParams);
  const folders = await listMediaFolders();

  // Dossier inconnu (supprimé, lien ancien) : message et retour à la racine.
  const isFolder = query.dossier !== "" && query.dossier !== UNCLASSIFIED;
  const path = isFolder ? folderPath(folders, query.dossier) : [];
  const missingFolder = isFolder && path.length === 0;
  const current = isFolder
    ? (folders.find((folder) => folder.id === query.dossier) ?? null)
    : null;

  const [result, unclassifiedCount, siteMedia] = await Promise.all([
    searchAdminMedia(
      missingFolder ? { ...query, dossier: "" } : query,
      folders,
    ),
    countUnclassifiedMedia(),
    getAdminSiteMedia(),
  ]);

  const folderName =
    query.dossier === UNCLASSIFIED
      ? "Non classés"
      : (current?.name ?? "Tous les médias");
  const emptyMessage = query.q
    ? `Aucun média ne correspond à « ${query.q} ».`
    : query.vue === "inutilises"
      ? "Aucun média inutilisé ici."
      : isFolder
        ? "Ce dossier ne contient aucun média. Importez-en ou déplacez-en ici."
        : "La médiathèque est vide : envoyez une première image ou un PDF.";

  return (
    <div className="space-y-6">
      <AdminPageHeader
        kicker="médias"
        title="Médiathèque"
        description="Images et PDF stockés hors de la base, rangés dans des dossiers virtuels : déplacer un média ne change ni son fichier, ni son adresse, ni ses usages. Un média utilisé ne peut pas être supprimé ; un média lié uniquement à un brouillon n'est pas accessible publiquement."
      />
      <p className="text-sm">
        <Link
          href="/admin/medias/projets"
          className="text-link hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          Couvertures et galeries des projets →
        </Link>
      </p>

      <div className="grid gap-6 lg:grid-cols-[16rem_1fr] lg:items-start">
        <aside className="space-y-6 lg:sticky lg:top-4">
          <AdminCard title="Dossiers" titleId="media-folders-title">
            <div className="max-h-72 overflow-y-auto lg:max-h-[50vh]">
              <MediaFolderNav
                folders={folders}
                query={query}
                unclassifiedCount={unclassifiedCount}
              />
            </div>
          </AdminCard>
          <AdminCard
            title="Gérer les dossiers"
            titleId="media-folder-admin-title"
          >
            <MediaFolderAdmin current={current} depth={path.length} />
          </AdminCard>
        </aside>

        <div className="min-w-0 space-y-6">
          <AdminCard
            title={folderName}
            titleId="media-library-title"
            description={<MediaBreadcrumb path={path} query={query} />}
          >
            <div className="space-y-4">
              {missingFolder ? (
                <p
                  role="alert"
                  className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  Ce dossier n&apos;existe plus : affichage de tous les médias.
                </p>
              ) : null}
              <MediaFilters query={query} />
              <MediaGrid
                items={result.items}
                total={result.total}
                page={result.page}
                pageCount={result.pageCount}
                query={query}
                folders={folders}
                emptyMessage={emptyMessage}
              />
            </div>
          </AdminCard>

          <div className="grid gap-6 xl:grid-cols-2">
            <AdminCard title="Envoyer un fichier" titleId="media-upload-title">
              <MediaUploadForm
                folder={current ? { id: current.id, name: current.name } : null}
              />
            </AdminCard>

            <AdminCard
              title="CV"
              titleId="media-cv-title"
              description={
                <>
                  Toujours servi à la même adresse :{" "}
                  <a
                    href="/cv"
                    target="_blank"
                    rel="noopener"
                    className="font-mono text-link hover:underline"
                  >
                    /cv
                  </a>{" "}
                  (téléchargement :{" "}
                  <span className="font-mono">/cv?download=1</span>). Remplacer
                  le PDF ne change pas l&apos;adresse.
                </>
              }
            >
              {siteMedia ? (
                <MediaSelectForm
                  action={setSiteMediaAction}
                  hidden={{ slot: "cv" }}
                  label="PDF du CV"
                  accept="DOCUMENT"
                  current={toPickerValue(siteMedia.cvMedia)}
                  emptyLabel="Aucun (pas de CV sur le site)"
                  shape="square"
                />
              ) : (
                <EmptyList>
                  Les réglages du site n&apos;existent pas encore : lancez le
                  seed initial.
                </EmptyList>
              )}
            </AdminCard>
          </div>
        </div>
      </div>
    </div>
  );
}

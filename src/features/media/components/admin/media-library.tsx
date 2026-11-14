import Link from "next/link";
import { FileText, Folder, FolderOpen } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { EmptyList } from "@/components/admin/admin-ui";
import { TextAreaField } from "@/components/admin/fields";
import { DeleteButton } from "@/components/admin/list-item-actions";
import {
  deleteMediaAction,
  moveMediaAction,
  updateMediaAltAction,
} from "@/features/media/actions";
import { SelectAllCheckbox } from "@/features/media/components/admin/select-all-checkbox";
import {
  flattenFolderTree,
  mediaQueryHref,
  UNCLASSIFIED,
  type FolderRow,
  type MediaQuery,
} from "@/features/media/library";
import { describeUsages, formatBytes } from "@/features/media/media-view";
import type { AdminMedia, AdminMediaFolder } from "@/features/media/queries";
import { mediaUrl } from "@/lib/media-keys";
import { cn } from "@/lib/utils";

const BASE = "/admin/medias";
const MOVE_FORM_ID = "move-media-form";
const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });
const linkClass =
  "text-link hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";
const controlClass =
  "h-9 rounded-lg border border-input bg-background px-2 text-sm text-foreground focus-visible:border-royal focus-visible:ring-2 focus-visible:ring-royal/40 focus-visible:outline-none";

/** Options « dossier de destination » : Non classés puis l'arborescence indentée. */
export function folderOptions(folders: FolderRow[]) {
  return [
    { value: "", label: "Non classés" },
    ...flattenFolderTree(folders).map((folder) => ({
      value: folder.id,
      label: `${"— ".repeat(folder.depth - 1)}${folder.name}`,
    })),
  ];
}

export function MediaFolderNav({
  folders,
  query,
  unclassifiedCount,
}: {
  folders: AdminMediaFolder[];
  query: MediaQuery;
  unclassifiedCount: number;
}) {
  // Changer de dossier repart de la première page, filtres conservés.
  const href = (dossier: string) =>
    mediaQueryHref(BASE, query, { dossier, page: 1 });
  const item = (key: string, dossier: string, label: string, depth = 1) => {
    const active = query.dossier === dossier;
    const Icon = active ? FolderOpen : Folder;
    return (
      <li key={key}>
        <Link
          href={href(dossier)}
          aria-current={active ? "page" : undefined}
          style={{ paddingLeft: `${0.25 + depth * 0.75}rem` }}
          className={cn(
            "flex items-center gap-1.5 rounded-md py-1.5 pr-2 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            active ? "bg-royal text-white" : "hover:bg-muted",
          )}
        >
          <Icon className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{label}</span>
        </Link>
      </li>
    );
  };

  return (
    <nav aria-label="Dossiers de la médiathèque">
      <ul className="space-y-0.5">
        {item("all", "", "Tous les médias", 0)}
        {item("none", UNCLASSIFIED, `Non classés (${unclassifiedCount})`, 0)}
        {flattenFolderTree(folders).map((folder) =>
          item(
            folder.id,
            folder.id,
            `${folder.name} (${folder._count.media})`,
            folder.depth,
          ),
        )}
      </ul>
    </nav>
  );
}

export function MediaBreadcrumb({
  path,
  query,
}: {
  path: FolderRow[];
  query: MediaQuery;
}) {
  return (
    <nav aria-label="Fil d'Ariane" className="text-sm">
      <ol className="flex flex-wrap items-center gap-1 text-muted-foreground">
        <li>
          <Link
            href={mediaQueryHref(BASE, query, { dossier: "", page: 1 })}
            className={linkClass}
          >
            Médiathèque
          </Link>
        </li>
        {query.dossier === UNCLASSIFIED ? (
          <li aria-current="page">/ Non classés</li>
        ) : null}
        {path.map((folder, index) => (
          <li key={folder.id}>
            /{" "}
            {index === path.length - 1 ? (
              <span aria-current="page" className="text-foreground">
                {folder.name}
              </span>
            ) : (
              <Link
                href={mediaQueryHref(BASE, query, {
                  dossier: folder.id,
                  page: 1,
                })}
                className={linkClass}
              >
                {folder.name}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Filtres en GET : l'URL garde dossier, recherche, type et tri (partageable, retour arrière). */
export function MediaFilters({ query }: { query: MediaQuery }) {
  return (
    <form
      method="get"
      action={BASE}
      role="search"
      aria-label="Rechercher dans la médiathèque"
      className="flex flex-wrap items-end gap-2"
    >
      {query.dossier ? (
        <input type="hidden" name="dossier" value={query.dossier} />
      ) : null}
      <label className="min-w-48 flex-1 space-y-1 text-xs">
        <span className="block font-medium">Rechercher</span>
        <input
          type="search"
          name="q"
          defaultValue={query.q}
          maxLength={100}
          placeholder="Nom de fichier ou texte alternatif"
          className={cn(controlClass, "w-full")}
        />
      </label>
      <label className="space-y-1 text-xs">
        <span className="block font-medium">Portée</span>
        <select
          name="portee"
          defaultValue={query.portee}
          className={controlClass}
        >
          <option value="dossier">Ce dossier et ses sous-dossiers</option>
          <option value="tout">Toute la médiathèque</option>
        </select>
      </label>
      <label className="space-y-1 text-xs">
        <span className="block font-medium">Type</span>
        <select name="type" defaultValue={query.type} className={controlClass}>
          <option value="tous">Tous</option>
          <option value="images">Images</option>
          <option value="pdf">PDF</option>
        </select>
      </label>
      <label className="space-y-1 text-xs">
        <span className="block font-medium">Tri</span>
        <select name="tri" defaultValue={query.tri} className={controlClass}>
          <option value="recents">Plus récents</option>
          <option value="anciens">Plus anciens</option>
          <option value="nom">Nom</option>
        </select>
      </label>
      <label className="space-y-1 text-xs">
        <span className="block font-medium">Usage</span>
        <select name="vue" defaultValue={query.vue} className={controlClass}>
          <option value="tous">Tous</option>
          <option value="inutilises">Non utilisés</option>
        </select>
      </label>
      <button
        type="submit"
        className="inline-flex h-9 items-center rounded-lg bg-royal px-3 text-sm font-medium text-white hover:bg-royal/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        Filtrer
      </button>
      {query.q || query.type !== "tous" || query.vue !== "tous" ? (
        <Link
          href={mediaQueryHref(BASE, query, {
            q: "",
            type: "tous",
            vue: "tous",
            portee: "dossier",
            page: 1,
          })}
          className={cn(linkClass, "h-9 px-1 text-sm leading-9")}
        >
          Effacer
        </Link>
      ) : null}
    </form>
  );
}

function MediaCard({ media }: { media: AdminMedia }) {
  const usages = describeUsages(media);
  const isImage = media.kind === "IMAGE";
  const missingAlt = isImage && !media.alt;
  const checkboxId = `select-${media.id}`;

  return (
    <li className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-background/60 has-[input[name=mediaIds]:checked]:border-royal has-[input[name=mediaIds]:checked]:ring-2 has-[input[name=mediaIds]:checked]:ring-royal/30">
      <div className="relative flex aspect-[4/3] items-center justify-center bg-muted">
        {isImage ? (
          // Miniature seulement (≤ 960 px), chargement différé.
          // eslint-disable-next-line @next/next/no-img-element -- média privé servi tel quel
          <img
            src={mediaUrl(media.storageKey, "thumbnail")}
            alt={media.alt}
            loading="lazy"
            decoding="async"
            className="size-full object-contain"
          />
        ) : (
          <FileText
            className="size-12 text-muted-foreground"
            aria-hidden="true"
          />
        )}
        <span className="absolute top-2 left-2 flex items-center rounded-md bg-card/90 p-1 shadow">
          <input
            id={checkboxId}
            type="checkbox"
            name="mediaIds"
            value={media.id}
            form={MOVE_FORM_ID}
            className="size-4 accent-royal"
          />
          <label htmlFor={checkboxId} className="sr-only">
            Sélectionner « {media.originalName} »
          </label>
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-2.5">
        <p className="truncate text-sm font-medium" title={media.originalName}>
          {media.originalName}
        </p>
        <p className="font-mono text-[11px] text-muted-foreground">
          {isImage ? "Image WebP" : "PDF"} · {formatBytes(media.sizeBytes)}
          {media.width && media.height
            ? ` · ${media.width}×${media.height}`
            : null}
          <br />
          {dateFormat.format(media.createdAt)}
        </p>
        <p className="text-xs">
          {usages.length > 0 ? (
            <span
              title={usages.join(" ; ")}
              className="rounded-md bg-emerald-600/10 px-1.5 py-0.5 text-emerald-800 dark:text-emerald-300"
            >
              utilisé ({usages.length})
            </span>
          ) : (
            <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-muted-foreground">
              non utilisé
            </span>
          )}
        </p>
        {missingAlt ? (
          <p className="text-xs text-destructive">Texte alternatif manquant.</p>
        ) : null}
        <details className="mt-auto pt-1">
          <summary className="cursor-pointer text-xs text-link hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
            Détails et actions
            <span className="sr-only"> — {media.originalName}</span>
          </summary>
          <div className="mt-2 space-y-3">
            {usages.length > 0 ? (
              <p className="text-xs">Utilisé : {usages.join(" ; ")}</p>
            ) : null}
            <ActionForm action={updateMediaAltAction} className="space-y-2">
              <input type="hidden" name="id" value={media.id} />
              <TextAreaField
                name="alt"
                label="Texte alternatif"
                idPrefix={`alt-${media.id}-`}
                maxLength={300}
                rows={2}
                defaultValue={media.alt}
              />
              <SubmitButton variant="secondary">
                Enregistrer le texte
              </SubmitButton>
            </ActionForm>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={mediaUrl(media.storageKey)}
                target="_blank"
                rel="noopener"
                className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                Ouvrir<span className="sr-only"> (nouvel onglet)</span>
              </a>
              {usages.length === 0 ? (
                <DeleteButton
                  id={media.id}
                  label={media.originalName}
                  action={deleteMediaAction}
                  consequence="Le fichier sera effacé du stockage."
                />
              ) : (
                <span className="text-xs text-muted-foreground">
                  Retirez-le de ses usages pour pouvoir le supprimer.
                </span>
              )}
            </div>
          </div>
        </details>
      </div>
    </li>
  );
}

export function MediaGrid({
  items,
  total,
  page,
  pageCount,
  query,
  folders,
  emptyMessage,
}: {
  items: AdminMedia[];
  total: number;
  page: number;
  pageCount: number;
  query: MediaQuery;
  folders: FolderRow[];
  emptyMessage: string;
}) {
  if (items.length === 0) return <EmptyList>{emptyMessage}</EmptyList>;

  return (
    <div className="space-y-4">
      <ActionForm
        id={MOVE_FORM_ID}
        action={moveMediaAction}
        className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-muted/40 p-3"
      >
        {/* Les cases des cartes rejoignent ce formulaire par l'attribut form. */}
        <SelectAllCheckbox formId={MOVE_FORM_ID} />
        <label className="space-y-1 text-xs">
          <span className="block font-medium">Déplacer la sélection vers</span>
          <select name="folderId" defaultValue="" className={controlClass}>
            {folderOptions(folders).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <SubmitButton variant="secondary">Déplacer</SubmitButton>
        <span className="text-xs text-muted-foreground">
          Rangement uniquement : fichiers, adresses et associations inchangés.
        </span>
      </ActionForm>

      <p className="text-xs text-muted-foreground" role="status">
        {total} média(s) — page {page} / {pageCount}
      </p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
        {items.map((item) => (
          <MediaCard key={item.id} media={item} />
        ))}
      </ul>

      {pageCount > 1 ? (
        <nav
          aria-label="Pages de la médiathèque"
          className="flex items-center justify-center gap-3 text-sm"
        >
          {page > 1 ? (
            <Link
              href={mediaQueryHref(BASE, query, { page: page - 1 })}
              className={linkClass}
            >
              ← Page précédente
            </Link>
          ) : null}
          <span className="text-muted-foreground">
            Page {page} / {pageCount}
          </span>
          {page < pageCount ? (
            <Link
              href={mediaQueryHref(BASE, query, { page: page + 1 })}
              className={linkClass}
            >
              Page suivante →
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}

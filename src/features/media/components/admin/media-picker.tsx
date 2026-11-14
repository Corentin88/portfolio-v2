"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  LoaderCircle,
  Search,
  X,
} from "lucide-react";
import { useModalDialog } from "@/components/shared/use-modal-dialog";
import { uploadMediaFromPickerAction } from "@/features/media/actions";
import { ACCEPTED_FILE_TYPES } from "@/features/media/file-validation";
import {
  flattenFolderTree,
  folderPath,
  mediaQueryParams,
  UNCLASSIFIED,
  DEFAULT_MEDIA_QUERY,
  type MediaQuery,
} from "@/features/media/library";
import { formatBytes } from "@/features/media/media-view";
import {
  acceptsMedia,
  toggleSelection,
  typeFilterFor,
  type MediaAccept,
  type PickerMedia,
  type PickerPage,
  type PickerValue,
} from "@/features/media/picker";
import { cn } from "@/lib/utils";

// Dossier et tri retenus d'une ouverture à l'autre pendant la session d'édition.
let lastFolder = "";
let lastSort: MediaQuery["tri"] = "recents";

const SEARCH_DELAY_MS = 300;

const buttonClass =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50";
const controlClass =
  "h-9 rounded-lg border border-input bg-background px-2 text-sm text-foreground focus-visible:border-royal focus-visible:ring-2 focus-visible:ring-royal/40 focus-visible:outline-none";

export type MediaPickerDialogProps = {
  title: string;
  accept: MediaAccept;
  multiple: boolean;
  /** Médias actuellement associés (mis en évidence). */
  currentIds?: string[];
  /** Médias à ne pas proposer (déjà dans la galerie). */
  excludedIds?: string[];
  /** Sélection déjà en attente dans le formulaire parent (choix multiple). */
  initialSelection?: PickerValue[];
  onConfirm: (selection: PickerValue[]) => void;
  /** Fermeture sans validation (Annuler, Échap, clic hors de la fenêtre). */
  onClose: () => void;
};

/**
 * Sélecteur universel de la médiathèque. Monté seulement à l'ouverture, rendu
 * dans <body> (portail) : son formulaire d'import ne s'imbrique jamais dans le
 * formulaire parent. Rien n'est enregistré ici : la sélection est rendue au
 * formulaire, qui reste seul à modifier les associations.
 */
export function MediaPickerDialog(props: MediaPickerDialogProps) {
  // Rendu uniquement après une action de l'utilisateur, donc côté client.
  return typeof document !== "undefined"
    ? createPortal(<PickerDialog {...props} />, document.body)
    : null;
}

function PickerDialog({
  title,
  accept,
  multiple,
  currentIds = [],
  excludedIds = [],
  initialSelection = [],
  onConfirm,
  onClose,
}: MediaPickerDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const statusId = useId();
  useModalDialog(ref);
  useEffect(() => searchRef.current?.focus(), []);

  const [folder, setFolder] = useState(lastFolder);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [scope, setScope] = useState<MediaQuery["portee"]>("dossier");
  const [sort, setSort] = useState<MediaQuery["tri"]>(lastSort);
  const [type, setType] = useState(typeFilterFor(accept));
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);

  // Dernière réponse reçue, associée à la requête qui l'a produite : le
  // chargement se déduit d'une clé différente (aucun setState dans l'effet).
  const [response, setResponse] = useState<{
    key: string;
    data?: PickerPage;
    error?: string;
  } | null>(null);

  const [selection, setSelection] = useState<PickerValue[]>(
    multiple ? initialSelection : [], // simple : le choix actuel reste visible par `currentIds`
  );
  const [preview, setPreview] = useState<PickerMedia | null>(null);
  const excluded = useMemo(() => new Set(excludedIds), [excludedIds]);
  const current = useMemo(() => new Set(currentIds), [currentIds]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    lastFolder = folder;
    lastSort = sort;
  }, [folder, sort]);

  const params = mediaQueryParams(DEFAULT_MEDIA_QUERY, {
    dossier: folder,
    q: debouncedSearch,
    portee: scope,
    tri: sort,
    type,
    page,
  });
  params.set("accept", accept);
  const requestKey = `${params}#${reload}`;

  // Une requête à la fois : la précédente est annulée (saisie rapide, pages).
  useEffect(() => {
    const controller = new AbortController();
    const [query] = requestKey.split("#");
    fetch(`/api/admin/medias?${query}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as
          (PickerPage & { error?: string }) | null;
        if (!response.ok || !body) {
          throw new Error(body?.error ?? "Chargement impossible.");
        }
        setResponse({ key: requestKey, data: body });
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setResponse((previous) => ({
          key: requestKey,
          data: previous?.data,
          error:
            reason instanceof Error ? reason.message : "Chargement impossible.",
        }));
      });
    return () => controller.abort();
  }, [requestKey]);

  const loading = response?.key !== requestKey;
  const data = response?.data ?? null;
  const error = loading ? null : (response?.error ?? null);

  const folders = data?.folders ?? [];
  const tree = flattenFolderTree(folders);
  const path =
    folder && folder !== UNCLASSIFIED ? folderPath(folders, folder) : [];
  const currentFolderName =
    folder === UNCLASSIFIED
      ? "Non classés"
      : (path.at(-1)?.name ?? "Tous les médias");

  const openFolder = (id: string) => {
    setFolder(id);
    setPage(1);
  };

  const toggle = (media: PickerMedia) => {
    setPreview(media);
    setSelection((previous) =>
      toggleSelection(previous, media, { multiple, accept, excluded }),
    );
  };

  const isSelected = (id: string) => selection.some((item) => item.id === id);
  const canConfirm = selection.length > 0;

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) ref.current?.close();
      }}
      className="m-auto flex h-[min(52rem,calc(100dvh-1rem))] w-[calc(100%-1rem)] max-w-6xl flex-col overflow-hidden rounded-2xl border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-navy-deep/70 backdrop:backdrop-blur-sm sm:w-[calc(100%-2rem)]"
    >
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 id={titleId} className="font-display text-lg font-semibold">
          {title}
        </h2>
        <button
          type="button"
          onClick={() => ref.current?.close()}
          aria-label="Fermer sans choisir"
          className={cn(buttonClass, "border border-border hover:bg-muted")}
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </header>

      <div className="grid min-h-0 flex-1 grid-rows-[auto_1fr] md:grid-cols-[15rem_1fr] md:grid-rows-1">
        <nav
          aria-label="Dossiers de la médiathèque"
          className="max-h-36 overflow-y-auto border-b border-border p-2 md:max-h-none md:border-r md:border-b-0"
        >
          <ul className="space-y-0.5 text-sm">
            <FolderButton
              label="Tous les médias"
              active={folder === ""}
              onClick={() => openFolder("")}
            />
            <FolderButton
              label={`Non classés (${data?.unclassifiedCount ?? "…"})`}
              active={folder === UNCLASSIFIED}
              onClick={() => openFolder(UNCLASSIFIED)}
            />
            {tree.map((item) => (
              <FolderButton
                key={item.id}
                label={`${item.name} (${item.mediaCount})`}
                depth={item.depth}
                active={folder === item.id}
                onClick={() => openFolder(item.id)}
              />
            ))}
          </ul>
        </nav>

        <div className="flex min-h-0 flex-col">
          <div className="space-y-2 border-b border-border p-3">
            <div className="flex flex-wrap items-end gap-2">
              <label className="relative min-w-48 flex-1">
                <span className="sr-only">
                  Rechercher par nom ou description
                </span>
                <Search
                  className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  ref={searchRef}
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Rechercher par nom ou description…"
                  maxLength={100}
                  className={cn(controlClass, "w-full pl-8")}
                />
              </label>
              <label className="text-xs">
                <span className="sr-only">Portée de la recherche</span>
                <select
                  value={scope}
                  onChange={(event) => {
                    setScope(event.target.value as MediaQuery["portee"]);
                    setPage(1);
                  }}
                  className={controlClass}
                >
                  <option value="dossier">Dans ce dossier</option>
                  <option value="tout">Toute la médiathèque</option>
                </select>
              </label>
              {accept === "ALL" ? (
                <label className="text-xs">
                  <span className="sr-only">Type de média</span>
                  <select
                    value={type}
                    onChange={(event) => {
                      setType(event.target.value as typeof type);
                      setPage(1);
                    }}
                    className={controlClass}
                  >
                    <option value="tous">Tous les types</option>
                    <option value="images">Images</option>
                    <option value="pdf">PDF</option>
                  </select>
                </label>
              ) : null}
              <label className="text-xs">
                <span className="sr-only">Tri</span>
                <select
                  value={sort}
                  onChange={(event) => {
                    setSort(event.target.value as MediaQuery["tri"]);
                    setPage(1);
                  }}
                  className={controlClass}
                >
                  <option value="recents">Plus récents</option>
                  <option value="anciens">Plus anciens</option>
                  <option value="nom">Nom</option>
                </select>
              </label>
            </div>
            <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              <FolderOpen className="size-3.5" aria-hidden="true" />
              <span>Médiathèque</span>
              {folder === UNCLASSIFIED ? <span>/ Non classés</span> : null}
              {path.map((item) => (
                <span key={item.id}>
                  /{" "}
                  <button
                    type="button"
                    onClick={() => openFolder(item.id)}
                    className="text-link hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    {item.name}
                  </button>
                </span>
              ))}
            </p>
          </div>

          <div className="grid min-h-0 flex-1 lg:grid-cols-[1fr_15rem]">
            <div className="min-h-0 overflow-y-auto p-3">
              <p
                id={statusId}
                role="status"
                aria-live="polite"
                className="mb-2 flex items-center gap-2 text-xs text-muted-foreground"
              >
                {loading ? (
                  <>
                    <LoaderCircle
                      className="size-3.5 animate-spin"
                      aria-hidden="true"
                    />
                    Chargement…
                  </>
                ) : data ? (
                  `${data.total} média(s)${debouncedSearch ? ` pour « ${debouncedSearch} »` : ""} — page ${data.page} / ${data.pageCount}`
                ) : null}
              </p>
              {error ? (
                <div
                  role="alert"
                  className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
                >
                  {error}{" "}
                  <button
                    type="button"
                    onClick={() => setReload((value) => value + 1)}
                    className="underline"
                  >
                    Réessayer
                  </button>
                </div>
              ) : data && data.items.length === 0 && !loading ? (
                <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  {debouncedSearch
                    ? "Aucun média ne correspond à cette recherche."
                    : "Ce dossier ne contient aucun média de ce type."}
                </p>
              ) : (
                <ul
                  aria-label={`Médias — ${currentFolderName}`}
                  aria-busy={loading}
                  className={cn(
                    "grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4",
                    loading && "opacity-60",
                  )}
                >
                  {(data?.items ?? []).map((media) => (
                    <PickerItem
                      key={media.id}
                      media={media}
                      selected={isSelected(media.id)}
                      current={current.has(media.id)}
                      excluded={excluded.has(media.id)}
                      allowed={acceptsMedia(accept, media)}
                      onToggle={() => toggle(media)}
                      onFocus={() => setPreview(media)}
                      onConfirm={
                        multiple ? undefined : () => onConfirm([media])
                      }
                    />
                  ))}
                </ul>
              )}
              {data && data.pageCount > 1 ? (
                <nav
                  aria-label="Pages de résultats"
                  className="mt-3 flex items-center justify-center gap-2"
                >
                  <button
                    type="button"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage(Math.max(1, data.page - 1))}
                    className={cn(
                      buttonClass,
                      "border border-border hover:bg-muted",
                    )}
                  >
                    <ChevronLeft className="size-4" aria-hidden="true" />
                    Précédente
                  </button>
                  <span className="text-xs text-muted-foreground">
                    Page {data.page} / {data.pageCount}
                  </span>
                  <button
                    type="button"
                    disabled={data.page >= data.pageCount || loading}
                    onClick={() => setPage(data.page + 1)}
                    className={cn(
                      buttonClass,
                      "border border-border hover:bg-muted",
                    )}
                  >
                    Suivante
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </button>
                </nav>
              ) : null}
            </div>

            <aside
              aria-label="Aperçu et import"
              className="hidden space-y-4 overflow-y-auto border-l border-border p-3 lg:block"
            >
              <PreviewPanel media={preview} />
              <PickerUpload
                accept={accept}
                folderId={folder === UNCLASSIFIED ? "" : folder}
                folderName={folder === "" ? "Non classés" : currentFolderName}
                onUploaded={(media) => {
                  setReload((value) => value + 1);
                  toggle(media);
                }}
              />
            </aside>
          </div>
        </div>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
        <div className="min-w-0 text-sm">
          {selection.length === 0 ? (
            <span className="text-muted-foreground">
              {multiple
                ? "Aucune image sélectionnée."
                : "Aucun média sélectionné."}
            </span>
          ) : (
            <span>
              {multiple
                ? `${selection.length} sélectionné(s) — conservés d'une page ou d'un dossier à l'autre`
                : `Sélection : ${selection[0]!.name}`}
            </span>
          )}
          <details className="mt-1 lg:hidden">
            <summary className="cursor-pointer text-xs text-link">
              Importer un fichier
            </summary>
            <div className="mt-2">
              <PickerUpload
                accept={accept}
                folderId={folder === UNCLASSIFIED ? "" : folder}
                folderName={folder === "" ? "Non classés" : currentFolderName}
                idSuffix="mobile"
                onUploaded={(media) => {
                  setReload((value) => value + 1);
                  toggle(media);
                }}
              />
            </div>
          </details>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => ref.current?.close()}
            className={cn(buttonClass, "border border-border hover:bg-muted")}
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={() => onConfirm(selection)}
            className={cn(buttonClass, "bg-royal text-white hover:bg-royal/90")}
          >
            {multiple
              ? `Valider la sélection (${selection.length})`
              : "Valider ce média"}
          </button>
        </div>
      </footer>
    </dialog>
  );
}

function FolderButton({
  label,
  active,
  depth = 0,
  onClick,
}: {
  label: string;
  active: boolean;
  depth?: number;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-current={active ? "true" : undefined}
        style={{ paddingLeft: `${0.5 + depth * 0.75}rem` }}
        className={cn(
          "flex w-full items-center gap-1.5 rounded-md py-1.5 pr-2 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          active ? "bg-royal text-white" : "hover:bg-muted",
        )}
      >
        <Folder className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">{label}</span>
      </button>
    </li>
  );
}

function PickerItem({
  media,
  selected,
  current,
  excluded,
  allowed,
  onToggle,
  onFocus,
  onConfirm,
}: {
  media: PickerMedia;
  selected: boolean;
  current: boolean;
  excluded: boolean;
  allowed: boolean;
  onToggle: () => void;
  onFocus: () => void;
  onConfirm?: () => void;
}) {
  const disabled = excluded || !allowed;
  const note = excluded
    ? "déjà dans la galerie"
    : current
      ? "choix actuel"
      : media.usageCount > 0
        ? "utilisé"
        : null;
  return (
    <li>
      <button
        type="button"
        aria-pressed={selected}
        disabled={disabled}
        onClick={onToggle}
        onFocus={onFocus}
        onDoubleClick={onConfirm}
        className={cn(
          "group relative flex w-full flex-col overflow-hidden rounded-lg border-2 bg-background text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          selected
            ? "border-royal ring-2 ring-royal/30"
            : "border-border hover:border-royal/50",
        )}
      >
        <span className="flex aspect-[4/3] items-center justify-center bg-muted">
          {media.thumbSrc ? (
            // Miniature seulement (≤ 960 px) ; chargement différé hors écran.
            // eslint-disable-next-line @next/next/no-img-element -- média privé servi tel quel
            <img
              src={media.thumbSrc}
              alt=""
              loading="lazy"
              decoding="async"
              className="size-full object-contain"
            />
          ) : (
            <FileText
              className="size-10 text-muted-foreground"
              aria-hidden="true"
            />
          )}
        </span>
        <span className="block truncate px-2 pt-1.5 text-xs font-medium">
          {media.name}
          {/* Nom accessible = texte visible complété (WCAG 2.5.3). */}
          {media.alt ? <span className="sr-only"> — {media.alt}</span> : null}
        </span>
        <span className="block truncate px-2 pb-1.5 font-mono text-[11px] text-muted-foreground">
          {media.kind === "IMAGE" ? "image" : "PDF"} ·{" "}
          {formatBytes(media.sizeBytes)}
          {note ? ` · ${note}` : ""}
        </span>
        {selected ? (
          <span
            aria-hidden="true"
            className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-royal text-white shadow"
          >
            <Check className="size-4" />
          </span>
        ) : null}
      </button>
    </li>
  );
}

function PreviewPanel({ media }: { media: PickerMedia | null }) {
  if (!media) {
    return (
      <p className="text-xs text-muted-foreground">
        Survolez ou sélectionnez un média pour l&apos;aperçu.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      <div className="flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
        {media.thumbSrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- média privé servi tel quel
          <img
            src={media.thumbSrc}
            alt=""
            className="size-full object-contain"
          />
        ) : (
          <FileText
            className="size-10 text-muted-foreground"
            aria-hidden="true"
          />
        )}
      </div>
      <p className="text-sm font-medium break-words">{media.name}</p>
      <dl className="space-y-0.5 font-mono text-[11px] text-muted-foreground">
        <div>
          <dt className="sr-only">Type et poids</dt>
          <dd>
            {media.kind === "IMAGE" ? "Image WebP" : "PDF"} ·{" "}
            {formatBytes(media.sizeBytes)}
          </dd>
        </div>
        {media.width && media.height ? (
          <div>
            <dt className="sr-only">Dimensions</dt>
            <dd>
              {media.width}×{media.height}
            </dd>
          </div>
        ) : null}
        {media.alt ? (
          <div>
            <dt className="sr-only">Texte alternatif</dt>
            <dd className="font-sans text-xs">{media.alt}</dd>
          </div>
        ) : null}
      </dl>
      <a
        href={media.src}
        target="_blank"
        rel="noopener"
        className="text-xs text-link hover:underline"
      >
        Ouvrir l&apos;original<span className="sr-only"> (nouvel onglet)</span>{" "}
        ↗
      </a>
    </div>
  );
}

/**
 * Import sans quitter le formulaire : même action serveur et mêmes contrôles que
 * la médiathèque. Le média importé rejoint le dossier courant et est présélectionné ;
 * une erreur s'affiche sans toucher à la sélection en cours.
 */
function PickerUpload({
  accept,
  folderId,
  folderName,
  idSuffix = "side",
  onUploaded,
}: {
  accept: MediaAccept;
  folderId: string;
  folderName: string;
  idSuffix?: string;
  onUploaded: (media: PickerMedia) => void;
}) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const fileId = useId();
  const altId = useId();

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true);
    setMessage(null);
    try {
      const result = await uploadMediaFromPickerAction(new FormData(form));
      if (result.ok) {
        if (!acceptsMedia(accept, result.media)) {
          setMessage({
            ok: false,
            text: "Fichier ajouté à la médiathèque, mais ce type n'est pas accepté ici.",
          });
        } else {
          setMessage({
            ok: true,
            text: `« ${result.media.name} » importé et sélectionné.`,
          });
          onUploaded(result.media);
        }
        form.reset();
      } else {
        setMessage({ ok: false, text: result.error });
      }
    } catch {
      setMessage({ ok: false, text: "Envoi impossible. Réessayez." });
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-2 rounded-lg border border-dashed border-border p-2"
      data-suffix={idSuffix}
    >
      <p className="text-xs font-medium">Importer dans « {folderName} »</p>
      <input type="hidden" name="folderId" value={folderId} />
      <label htmlFor={fileId} className="sr-only">
        Fichier à importer
      </label>
      <input
        id={fileId}
        name="file"
        type="file"
        required
        accept={
          accept === "DOCUMENT"
            ? ".pdf,application/pdf"
            : accept === "IMAGE"
              ? "image/jpeg,image/png,image/webp,image/avif"
              : ACCEPTED_FILE_TYPES
        }
        className="block w-full text-xs file:mr-2 file:rounded-md file:border file:border-border file:bg-muted file:px-2 file:py-1 file:text-xs file:text-foreground"
      />
      {accept !== "DOCUMENT" ? (
        <>
          <label htmlFor={altId} className="block text-xs">
            Texte alternatif (obligatoire pour une image)
          </label>
          <input
            id={altId}
            name="alt"
            maxLength={300}
            className={cn(controlClass, "w-full")}
          />
        </>
      ) : (
        <input type="hidden" name="alt" value="" />
      )}
      <button
        type="submit"
        disabled={pending}
        className={cn(
          buttonClass,
          "w-full border border-border hover:bg-muted",
        )}
      >
        {pending ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        ) : null}
        Importer
      </button>
      {message ? (
        <p
          role={message.ok ? "status" : "alert"}
          className={cn(
            "text-xs",
            message.ok
              ? "text-emerald-700 dark:text-emerald-300"
              : "text-destructive",
          )}
        >
          {message.text}
        </p>
      ) : null}
    </form>
  );
}

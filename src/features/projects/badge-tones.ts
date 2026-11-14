/**
 * Variantes de couleur du badge d'un projet. Le badge est un état éditorial saisi
 * à la main (« En ligne », « En refonte »…) : il ne surveille rien et ne dépend
 * pas du statut de publication.
 */
export const BADGE_TONE_OPTIONS = [
  { value: "success", label: "Vert — ex. « En ligne »" },
  { value: "warning", label: "Ambre — ex. « En cours de refonte »" },
  { value: "danger", label: "Rouge — ex. « Hors ligne »" },
  { value: "info", label: "Bleu — ex. « En développement »" },
  { value: "neutral", label: "Gris — ex. « Archivé »" },
] as const;

export type BadgeTone = (typeof BADGE_TONE_OPTIONS)[number]["value"];

export const BADGE_TONES = BADGE_TONE_OPTIONS.map((tone) => tone.value) as [
  BadgeTone,
  ...BadgeTone[],
];

/** Valeur historique (badges créés avant le choix de couleur). */
export const DEFAULT_BADGE_TONE: BadgeTone = "warning";

export function toBadgeTone(value: string | null | undefined): BadgeTone {
  return (BADGE_TONES as readonly string[]).includes(value ?? "")
    ? (value as BadgeTone)
    : DEFAULT_BADGE_TONE;
}

type ToneClasses = { text: string; dot: string; surface: string };

/**
 * Sur la couverture des cartes : pastille sombre translucide identique dans les
 * deux thèmes, d'où des teintes claires (contraste ≥ 7:1 sur panel-dark).
 */
export const BADGE_ON_DARK: Record<BadgeTone, Omit<ToneClasses, "surface">> = {
  success: { text: "text-green-300", dot: "bg-green-400" },
  warning: { text: "text-amber-vivid", dot: "bg-amber-vivid" },
  danger: { text: "text-red-300", dot: "bg-red-400" },
  info: { text: "text-sky-300", dot: "bg-sky-400" },
  neutral: { text: "text-slate-300", dot: "bg-slate-400" },
};

/** Sur fond de page (fiche projet, administration) : teintes adaptées au thème (AA). */
export const BADGE_ON_SURFACE: Record<BadgeTone, ToneClasses> = {
  success: {
    text: "text-green-800 dark:text-green-300",
    dot: "bg-green-600 dark:bg-green-400",
    surface: "border-green-600/40 bg-green-600/10",
  },
  warning: {
    text: "text-amber-brand",
    dot: "bg-amber-brand",
    surface: "border-amber-brand/40 bg-amber-brand/10",
  },
  danger: {
    text: "text-red-800 dark:text-red-300",
    dot: "bg-red-600 dark:bg-red-400",
    surface: "border-red-600/40 bg-red-600/10",
  },
  info: {
    text: "text-blue-800 dark:text-sky-300",
    dot: "bg-blue-600 dark:bg-sky-400",
    surface: "border-blue-600/40 bg-blue-600/10",
  },
  neutral: {
    text: "text-slate-700 dark:text-slate-300",
    dot: "bg-slate-500 dark:bg-slate-400",
    surface: "border-slate-500/40 bg-slate-500/10",
  },
};

/**
 * Seuls les états « en cours » pulsent : un point vert animé laisserait croire à
 * une surveillance en direct de la disponibilité du site.
 */
export function badgePulses(tone: BadgeTone): boolean {
  return tone === "warning" || tone === "info";
}

/** Icônes d'étape disponibles : liste partagée par le site public et l'administration. */
export const TIMELINE_ICONS = [
  { value: "alt", label: "<Alt/> (école Alt)" },
  { value: "users", label: "Équipe" },
  { value: "rocket", label: "Fusée" },
  { value: "graduation", label: "Diplôme" },
  { value: "compass", label: "Boussole" },
  { value: "sprout", label: "Pousse" },
  { value: "code", label: "Code" },
] as const;

export type TimelineIconKey = (typeof TIMELINE_ICONS)[number]["value"];

export const TIMELINE_ICON_KEYS = TIMELINE_ICONS.map((icon) => icon.value) as [
  TimelineIconKey,
  ...TimelineIconKey[],
];

/** Icônes des projets : liste partagée par le site public et l'administration. */
export const PROJECT_ICON_OPTIONS = [
  { value: "code", label: "Code" },
  { value: "rss", label: "Flux (actualités)" },
  { value: "cloud-sun", label: "Météo" },
  { value: "hand-heart", label: "Solidarité" },
  { value: "trophy", label: "Trophée" },
  { value: "camera", label: "Photo" },
  { value: "mountain", label: "Montagne" },
] as const;

export type ProjectIconKey = (typeof PROJECT_ICON_OPTIONS)[number]["value"];

export const PROJECT_ICON_KEYS = PROJECT_ICON_OPTIONS.map(
  (icon) => icon.value,
) as [ProjectIconKey, ...ProjectIconKey[]];

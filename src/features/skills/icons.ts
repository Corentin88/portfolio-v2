/** Icônes des piliers : liste partagée par le site public et l'administration. */
export const PILLAR_ICONS = [
  { value: "code", label: "Code" },
  { value: "radar", label: "Radar (veille)" },
  { value: "layout-dashboard", label: "Interface" },
  { value: "flame", label: "Flamme (passion)" },
] as const;

export type PillarIconKey = (typeof PILLAR_ICONS)[number]["value"];

export const PILLAR_ICON_KEYS = PILLAR_ICONS.map((icon) => icon.value) as [
  PillarIconKey,
  ...PillarIconKey[],
];

import { z } from "zod";

/** Texte obligatoire, nettoyé des espaces, borné à la longueur de la colonne SQL. */
export function requiredText(max: number) {
  return z
    .string()
    .trim()
    .min(1, { error: "Champ obligatoire." })
    .max(max, { error: `${max} caractères maximum.` });
}

/** Texte facultatif : une saisie vide est enregistrée comme null. */
export function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max, { error: `${max} caractères maximum.` })
    .transform((value) => value || null);
}

/**
 * Adresse web externe sûre : analysée par URL (pas seulement une expression
 * régulière), protocole http(s) uniquement, sans identifiants intégrés
 * (https://user:pass@…) ni hôte vide. Bloque javascript:, data:, etc.
 */
export function isSafeExternalUrl(value: string): boolean {
  if (/\s/.test(value)) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return (
    (url.protocol === "https:" || url.protocol === "http:") &&
    url.hostname.length > 0 &&
    !url.username &&
    !url.password
  );
}

/** URL http(s) facultative. */
export function optionalHttpUrl(max = 500) {
  return z
    .string()
    .trim()
    .max(max, { error: `${max} caractères maximum.` })
    .refine((value) => value === "" || isSafeExternalUrl(value), {
      error: "Adresse web invalide (https://…).",
    })
    .transform((value) => value || null);
}

/**
 * Case à cocher HTML : présente (« on ») ou absente du formulaire. Avec Zod 4, seul
 * .optional() rend la clé facultative dans un objet (une union avec undefined ne suffit pas).
 */
export function checkbox() {
  return z
    .enum(["on", "true"])
    .optional()
    .transform((value) => value !== undefined);
}

export const idSchema = z.string().trim().min(1).max(30);

export const moveSchema = z.object({
  id: idSchema,
  direction: z.enum(["up", "down"]),
});

export const deleteSchema = z.object({ id: idSchema });

/** Séparateur des valeurs d'un champ répété (cases à cocher multiples). */
export const MULTI_VALUE_SEPARATOR = ",";

/**
 * Champs du formulaire sous forme d'objet (les cases non cochées sont absentes).
 * Un champ répété (plusieurs cases du même nom) est joint par une virgule : ses
 * valeurs sont des identifiants, qui n'en contiennent jamais.
 */
export function formDataToObject(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$ACTION")) {
      values[key] =
        key in values
          ? `${values[key]}${MULTI_VALUE_SEPARATOR}${value}`
          : value;
    }
  }
  return values;
}

/** Liste d'identifiants issue de cases à cocher multiples (vide si aucune). */
export function idList(max: number) {
  return z
    .string()
    .optional()
    .transform((value) => [
      ...new Set(
        (value ?? "")
          .split(MULTI_VALUE_SEPARATOR)
          .map((id) => id.trim())
          .filter(Boolean),
      ),
    ])
    .pipe(z.array(idSchema).max(max, { error: `${max} éléments maximum.` }));
}

/**
 * Liste saisie à raison d'un élément par ligne (lignes vides ignorées). La
 * section entière est remplacée à l'enregistrement.
 */
export function lineList(maxItems: number, maxLength: number) {
  return z
    .string()
    .optional()
    .transform((value) =>
      (value ?? "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    )
    .pipe(
      z
        .array(
          z.string().max(maxLength, {
            error: `Chaque ligne : ${maxLength} caractères maximum.`,
          }),
        )
        .max(maxItems, { error: `${maxItems} lignes maximum.` }),
    );
}

/** Date facultative au format du champ HTML (AAAA-MM-JJ), vide = null. */
export function optionalDate() {
  return z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" ||
        (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
          !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
          new Date(`${value}T00:00:00Z`).toISOString().startsWith(value)),
      { error: "Date invalide." },
    )
    .transform((value) => (value ? new Date(`${value}T00:00:00Z`) : null));
}

/** Slug d'URL en minuscules, sans accents ni ponctuation (« Outils & DevOps » → « outils-devops »). */
export function slugify(value: string, maxLength = 80): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
}

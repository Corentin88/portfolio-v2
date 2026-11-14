export type Positioned = { id: string; position: number };

/**
 * Échange un élément avec son voisin dans une liste ordonnée. Les positions sont
 * renumérotées de 0 à n-1 (ce qui corrige des positions en double), mais seules
 * celles qui changent réellement sont renvoyées, pour n'écrire que le nécessaire.
 * Renvoie null si le déplacement est impossible (élément absent ou déjà en bout).
 */
export function moveInList(
  items: Positioned[],
  id: string,
  direction: "up" | "down",
): Positioned[] | null {
  const ordered = [...items].sort((a, b) => a.position - b.position);
  const index = ordered.findIndex((item) => item.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || target < 0 || target >= ordered.length) return null;

  [ordered[index], ordered[target]] = [ordered[target]!, ordered[index]!];
  return ordered
    .map((item, position) => ({
      id: item.id,
      position,
      previous: item.position,
    }))
    .filter((item) => item.position !== item.previous)
    .map(({ id: itemId, position }) => ({ id: itemId, position }));
}

/** Position à attribuer à un nouvel élément ajouté en fin de liste. */
export function nextPosition(currentMax: number | null | undefined): number {
  return currentMax === null || currentMax === undefined ? 0 : currentMax + 1;
}

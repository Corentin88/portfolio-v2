/** Durée de conservation lisible : « 1 an », « 6 mois », « 45 jours ». */
export function formatRetention(days: number): string {
  if (days % 365 === 0) {
    const years = days / 365;
    return `${years} an${years > 1 ? "s" : ""}`;
  }
  if (days % 30 === 0) return `${days / 30} mois`;
  return `${days} jour${days > 1 ? "s" : ""}`;
}

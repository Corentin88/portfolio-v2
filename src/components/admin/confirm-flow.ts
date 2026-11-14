/** Contenu de la modale : question courte et conséquence de l'action. */
export type Confirmation = {
  title: string;
  message: string;
  /** Libellé du bouton de confirmation (« Supprimer définitivement » par défaut). */
  confirmLabel?: string;
};

/**
 * États d'une soumission soumise à confirmation :
 * idle → asking (modale ouverte) → submitting (action lancée) → idle.
 * En « submitting », la modale reste ouverte jusqu'au résultat de l'action, qui
 * remplace l'état de useActionState par un nouvel objet.
 */
export type ConfirmPhase<State> =
  | { step: "idle" }
  | { step: "asking" }
  | { step: "submitting"; stateAtSubmit: State };

export function isConfirmDialogOpen<State>(
  phase: ConfirmPhase<State>,
  currentState: State,
): boolean {
  if (phase.step === "asking") return true;
  if (phase.step === "submitting") return currentState === phase.stateAtSubmit;
  return false;
}

/**
 * La soumission doit-elle être retenue pour confirmation ? Non si aucune
 * confirmation n'est demandée, ou si elle vient d'être donnée (re-soumission
 * déclenchée par le bouton Confirmer).
 */
export function shouldAskConfirmation(
  confirmation: Confirmation | undefined,
  justConfirmed: boolean,
): boolean {
  return confirmation !== undefined && !justConfirmed;
}

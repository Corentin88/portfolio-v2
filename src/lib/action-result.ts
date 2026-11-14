/** Résultat d'une Server Action de formulaire, consommé par useActionState. */
export type ActionResult =
  | { ok: true; message: string }
  | {
      ok: false;
      error: string;
      fieldErrors?: Record<string, string>;
      /**
       * Valeurs soumises : React 19 réinitialise le formulaire après l'action,
       * on les réaffiche pour ne pas faire perdre la saisie en cas d'erreur.
       */
      values?: Record<string, string>;
    };

export type ActionState = ActionResult | null;

export type FormAction = (
  previous: ActionState,
  formData: FormData,
) => Promise<ActionResult>;

"use client";

import {
  createContext,
  use,
  useActionState,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import {
  isConfirmDialogOpen,
  shouldAskConfirmation,
  type ConfirmPhase,
  type Confirmation,
} from "@/components/admin/confirm-flow";
import type { ActionState, FormAction } from "@/lib/action-result";
import { cn } from "@/lib/utils";

type FormContextValue = {
  fieldErrors?: Record<string, string>;
  /** Valeurs soumises lors d'un échec, prioritaires sur les valeurs par défaut. */
  values?: Record<string, string>;
  pending: boolean;
};

const FormContext = createContext<FormContextValue>({ pending: false });

export function useActionFormContext(): FormContextValue {
  return use(FormContext);
}

type ActionFormProps = {
  action: FormAction;
  children: ReactNode;
  className?: string;
  /** Demande une confirmation dans une modale avant l'envoi (suppressions définitives). */
  confirm?: Confirmation;
  /** Masque le message de succès (actions de liste comme le déplacement). */
  quietSuccess?: boolean;
  /** Identifiant du <form>, pour y rattacher des champs placés ailleurs (attribut form). */
  id?: string;
};

/** Formulaire relié à une Server Action, avec erreurs par champ et message de retour. */
export function ActionForm({
  action,
  children,
  className,
  confirm: confirmation,
  quietSuccess = false,
  id,
}: ActionFormProps) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    null,
  );

  const formRef = useRef<HTMLFormElement>(null);
  // Bouton à l'origine de la demande : renvoyé tel quel après confirmation
  // (son name/value fait partie des données) et refocalisé après annulation.
  const submitterRef = useRef<HTMLElement | null>(null);
  const justConfirmed = useRef(false);
  const [phase, setPhase] = useState<ConfirmPhase<ActionState>>({
    step: "idle",
  });
  const dialogOpen = isConfirmDialogOpen(phase, state);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (!shouldAskConfirmation(confirmation, justConfirmed.current)) {
      justConfirmed.current = false;
      return;
    }
    event.preventDefault();
    submitterRef.current = (event.nativeEvent as SubmitEvent).submitter;
    setPhase({ step: "asking" });
  };

  const confirm = () => {
    if (phase.step !== "asking") return;
    setPhase({ step: "submitting", stateAtSubmit: state });
    justConfirmed.current = true;
    const submitter = submitterRef.current;
    formRef.current?.requestSubmit(
      submitter instanceof HTMLButtonElement ? submitter : undefined,
    );
  };

  // Annulation : le focus revient sur le bouton qui a ouvert la confirmation.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !dialogOpen && submitterRef.current?.isConnected) {
      submitterRef.current.focus();
    }
    wasOpen.current = dialogOpen;
  }, [dialogOpen]);

  const failure = state && !state.ok ? state : undefined;

  return (
    <form
      ref={formRef}
      id={id}
      action={formAction}
      onSubmit={onSubmit}
      noValidate
      className={className}
    >
      {dialogOpen && confirmation ? (
        <ConfirmDialog
          title={confirmation.title}
          message={confirmation.message}
          confirmLabel={confirmation.confirmLabel ?? "Supprimer définitivement"}
          pending={phase.step === "submitting"}
          onConfirm={confirm}
          onCancel={() => setPhase({ step: "idle" })}
        />
      ) : null}
      <FormContext
        value={{
          fieldErrors: failure?.fieldErrors,
          values: failure?.values,
          pending,
        }}
      >
        {children}
      </FormContext>
      {state && (!state.ok || !quietSuccess) ? (
        <p
          role={state.ok ? "status" : "alert"}
          className={cn(
            "mt-3 rounded-lg px-3 py-2 text-sm",
            state.ok
              ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border border-destructive/40 bg-destructive/10 text-destructive",
          )}
        >
          {state.ok ? state.message : state.error}
        </p>
      ) : null}
    </form>
  );
}

type SubmitButtonProps = {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger";
  name?: string;
  value?: string;
  ariaLabel?: string;
  disabled?: boolean;
};

const buttonVariants = {
  primary: "bg-royal text-white hover:bg-royal/90",
  secondary: "border border-border hover:bg-muted",
  danger:
    "border border-destructive/40 text-destructive hover:bg-destructive/10",
};

export function SubmitButton({
  children,
  variant = "primary",
  name,
  value,
  ariaLabel,
  disabled,
}: SubmitButtonProps) {
  const { pending } = useActionFormContext();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      aria-label={ariaLabel}
      disabled={pending || disabled}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        buttonVariants[variant],
      )}
    >
      {children}
    </button>
  );
}

"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { CircleAlert, CircleCheck, LoaderCircle, Send } from "lucide-react";
import type { ActionState } from "@/lib/action-result";
import { cn } from "@/lib/utils";
import { sendContactMessage } from "@/features/contact/actions";
import {
  CONTACT_LIMITS,
  HONEYPOT_FIELD,
  STARTED_AT_FIELD,
  SUBMISSION_ID_FIELD,
} from "@/features/contact/schemas";

const labelClass =
  "font-mono text-xs tracking-widest text-sky-soft/80 uppercase";

function inputClass(invalid: boolean): string {
  return cn(
    "w-full rounded-md border bg-foreground/5 px-3 text-base text-foreground placeholder:text-sky-soft/40 sm:text-sm",
    "transition-colors focus-visible:border-amber-brand focus-visible:ring-[3px] focus-visible:ring-amber-brand/40 focus-visible:outline-none",
    invalid ? "border-destructive" : "border-foreground/15",
  );
}

type FieldProps = {
  name: "name" | "email" | "subject" | "message";
  label: React.ReactNode;
  error?: string;
  children: (props: {
    id: string;
    name: string;
    "aria-invalid": true | undefined;
    "aria-describedby": string | undefined;
  }) => React.ReactNode;
};

function Field({ name, label, error, children }: FieldProps) {
  const id = `contact-${name}`;
  const errorId = `${id}-error`;
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {children({
        id,
        name,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": error ? errorId : undefined,
      })}
      {error ? (
        <p id={errorId} className="font-mono text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Formulaire de contact ; remonté (clé) pour écrire un nouveau message. */
export function ContactForm({ retention }: { retention: string }) {
  const [attempt, setAttempt] = useState(0);
  return (
    <ContactFormBody
      key={attempt}
      retention={retention}
      onReset={() => setAttempt((value) => value + 1)}
    />
  );
}

function ContactFormBody({
  retention,
  onReset,
}: {
  retention: string;
  onReset: () => void;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    sendContactMessage,
    null,
  );
  // Heure d'affichage du formulaire, transmise à l'envoi : une soumission
  // quasi instantanée trahit un robot (contrôle côté serveur).
  const startedAt = useRef(0);
  // Une clé par message : une nouvelle tentative (réseau coupé, double clic)
  // est reconnue par le serveur et ne crée pas de doublon.
  const submissionId = useRef("");
  const successRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    startedAt.current = Date.now();
    submissionId.current = crypto.randomUUID();
  }, []);

  useEffect(() => {
    if (state?.ok) successRef.current?.focus();
  }, [state]);

  if (state?.ok) {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        role="status"
        className="flex h-full min-h-80 flex-col items-center justify-center gap-4 rounded-2xl border border-green-500/30 bg-green-500/10 p-8 text-center outline-none sm:p-10"
      >
        <CircleCheck
          className="size-14 text-green-600 dark:text-green-400"
          aria-hidden="true"
        />
        <p className="font-display text-2xl font-bold text-foreground">
          Message envoyé&nbsp;!
        </p>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
          {state.message}
        </p>
        <button
          type="button"
          onClick={onReset}
          className="mt-2 inline-flex h-10 items-center rounded-full border border-border px-5 text-sm font-medium text-foreground transition-colors hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-amber-brand focus-visible:outline-none"
        >
          Écrire un autre message
        </button>
      </div>
    );
  }

  const failure = state && !state.ok ? state : undefined;
  const errors = failure?.fieldErrors ?? {};
  const values = failure?.values ?? {};

  return (
    <form
      action={(formData) => {
        formData.set(STARTED_AT_FIELD, String(startedAt.current));
        formData.set(SUBMISSION_ID_FIELD, submissionId.current);
        formAction(formData);
      }}
      noValidate
      aria-label="Formulaire de contact"
      aria-busy={pending}
      className="relative rounded-2xl border border-border bg-navy-deep/60 p-5 backdrop-blur-sm sm:p-8"
    >
      {/* Piège à robots : invisible et hors du parcours clavier. */}
      <div
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
      >
        <label>
          Ne pas remplir ce champ
          <input
            type="text"
            name={HONEYPOT_FIELD}
            tabIndex={-1}
            autoComplete="off"
          />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="name" label="Prénom & Nom" error={errors.name}>
          {(props) => (
            <input
              {...props}
              required
              autoComplete="name"
              maxLength={CONTACT_LIMITS.name}
              defaultValue={values.name}
              placeholder="Marie Dupont"
              className={cn(inputClass(Boolean(errors.name)), "h-11")}
            />
          )}
        </Field>
        <Field name="email" label="Votre e-mail" error={errors.email}>
          {(props) => (
            <input
              {...props}
              type="email"
              required
              autoComplete="email"
              maxLength={CONTACT_LIMITS.email}
              defaultValue={values.email}
              placeholder="marie@exemple.fr"
              className={cn(inputClass(Boolean(errors.email)), "h-11")}
            />
          )}
        </Field>
      </div>

      <div className="mt-5">
        <Field
          name="subject"
          label={
            <>
              Sujet <span className="normal-case opacity-60">(facultatif)</span>
            </>
          }
          error={errors.subject}
        >
          {(props) => (
            <input
              {...props}
              maxLength={CONTACT_LIMITS.subject}
              defaultValue={values.subject}
              placeholder="Alternance, refonte de site, question…"
              className={cn(inputClass(Boolean(errors.subject)), "h-11")}
            />
          )}
        </Field>
      </div>

      <div className="mt-5">
        <Field name="message" label="Votre message" error={errors.message}>
          {(props) => (
            <textarea
              {...props}
              required
              rows={6}
              maxLength={CONTACT_LIMITS.messageMax}
              defaultValue={values.message}
              placeholder="Bonjour Corentin, j'aurais un projet à vous proposer…"
              className={cn(
                inputClass(Boolean(errors.message)),
                "min-h-36 resize-y py-2.5",
              )}
            />
          )}
        </Field>
      </div>

      {failure ? (
        <p
          role="alert"
          className="mt-5 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {failure.error}
        </p>
      ) : null}

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-muted-foreground sm:max-w-xs">
          Vos coordonnées servent uniquement à vous répondre. Le message est
          conservé {retention} au plus, puis supprimé.
        </p>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-full bg-amber-vivid px-10 text-base font-semibold text-amber-ink shadow-lg shadow-amber-vivid/20 transition-all hover:-translate-y-0.5 hover:bg-amber-vivid/90 focus-visible:ring-2 focus-visible:ring-amber-brand focus-visible:ring-offset-2 focus-visible:ring-offset-navy-deep focus-visible:outline-none disabled:translate-y-0 disabled:opacity-70 sm:w-auto"
        >
          {pending ? (
            <>
              <LoaderCircle
                className="size-5 animate-spin"
                aria-hidden="true"
              />
              Envoi en cours…
            </>
          ) : (
            <>
              <Send className="size-5" aria-hidden="true" />
              Envoyer
            </>
          )}
        </button>
      </div>
    </form>
  );
}

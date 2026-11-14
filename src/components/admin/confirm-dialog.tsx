"use client";

import { useId, useLayoutEffect, useRef } from "react";
import { LoaderCircle, TriangleAlert } from "lucide-react";
import { useModalDialog } from "@/components/shared/use-modal-dialog";

type ConfirmDialogProps = {
  title: string;
  message: string;
  confirmLabel: string;
  /** Action en cours : boutons désactivés, Échap et clic extérieur ignorés. */
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Confirmation d'une action destructive, à monter seulement quand elle est
 * demandée. Dialogue natif modal : focus piégé, fond inerte, Échap = Annuler.
 * Le focus part sur « Annuler » : Entrée par réflexe ne supprime rien.
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  pending,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const messageId = useId();

  useModalDialog(ref);
  // Après l'ouverture modale (effet précédent), qui place le focus ailleurs.
  useLayoutEffect(() => {
    cancelRef.current?.focus();
  }, []);

  const cancel = () => {
    if (!pending) onCancel();
  };

  return (
    <dialog
      ref={ref}
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={messageId}
      aria-busy={pending}
      onCancel={(event) => {
        // Échap : fermeture pilotée par React (démontage), jamais pendant l'action.
        event.preventDefault();
        cancel();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) cancel();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-navy-deep/70 backdrop:backdrop-blur-sm"
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive"
          >
            <TriangleAlert className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="font-mono text-xs text-amber-brand">
              {"// confirmation"}
            </p>
            <h2
              id={titleId}
              className="mt-1 font-display text-lg font-semibold text-balance"
            >
              {title}
            </h2>
            <p
              id={messageId}
              className="mt-2 text-sm leading-relaxed wrap-break-word text-muted-foreground"
            >
              {message}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={cancel}
            disabled={pending}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-600/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pending ? (
              <>
                <LoaderCircle
                  className="size-4 animate-spin"
                  aria-hidden="true"
                />
                Suppression…
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </dialog>
  );
}

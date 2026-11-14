"use client";

import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import type { FormAction } from "@/lib/action-result";

type MoveButtonsProps = {
  id: string;
  label: string;
  action: FormAction;
  isFirst: boolean;
  isLast: boolean;
};

/** Monter / descendre un élément d'une liste ordonnée. */
export function MoveButtons({
  id,
  label,
  action,
  isFirst,
  isLast,
}: MoveButtonsProps) {
  return (
    <ActionForm action={action} quietSuccess className="flex gap-1">
      <input type="hidden" name="id" value={id} />
      <SubmitButton
        variant="secondary"
        name="direction"
        value="up"
        ariaLabel={`Monter « ${label} »`}
        disabled={isFirst}
      >
        <ArrowUp className="size-4" aria-hidden="true" />
      </SubmitButton>
      <SubmitButton
        variant="secondary"
        name="direction"
        value="down"
        ariaLabel={`Descendre « ${label} »`}
        disabled={isLast}
      >
        <ArrowDown className="size-4" aria-hidden="true" />
      </SubmitButton>
    </ActionForm>
  );
}

type DeleteButtonProps = {
  id: string;
  label: string;
  action: FormAction;
  /** Conséquence précise de la suppression, affichée dans la confirmation. */
  consequence?: string;
};

export function DeleteButton({
  id,
  label,
  action,
  consequence,
}: DeleteButtonProps) {
  return (
    <ActionForm
      action={action}
      confirm={{
        title: `Supprimer « ${label} » ?`,
        message: consequence ?? "Cette action est définitive.",
      }}
    >
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="danger" ariaLabel={`Supprimer « ${label} »`}>
        <Trash2 className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">Supprimer</span>
      </SubmitButton>
    </ActionForm>
  );
}

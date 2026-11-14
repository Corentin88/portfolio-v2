"use client";

import { useEffect, useRef } from "react";
import { Check, Mail, MailOpen, Send, Trash2 } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import {
  deleteMessageAction,
  markMessageAsReadAction,
  resendNotificationAction,
  setMessageStatusAction,
} from "@/features/contact/actions";
import type { MessageStatus } from "@/features/contact/schemas";

/**
 * Marque le message comme lu à l'ouverture (effet client, donc jamais lors du
 * préchargement du lien). Seul l'état à l'ouverture compte : repasser le message
 * en « non lu » ensuite ne doit pas le remarquer comme lu.
 */
export function MarkAsReadOnView({
  id,
  unread,
}: {
  id: string;
  unread: boolean;
}) {
  const unreadOnOpen = useRef(unread);
  useEffect(() => {
    if (unreadOnOpen.current) void markMessageAsReadAction(id);
  }, [id]);
  return null;
}

const STATUS_BUTTONS: Record<
  MessageStatus,
  { label: string; Icon: typeof Mail }
> = {
  unread: { label: "Marquer non lu", Icon: Mail },
  read: { label: "Marquer lu", Icon: MailOpen },
  handled: { label: "Marquer traité", Icon: Check },
};

export function MessageStatusButtons({
  id,
  status,
}: {
  id: string;
  status: MessageStatus;
}) {
  const targets = (["unread", "read", "handled"] as const).filter(
    (target) => target !== status,
  );
  return (
    <ActionForm
      action={setMessageStatusAction}
      className="flex flex-wrap gap-2"
    >
      <input type="hidden" name="id" value={id} />
      {targets.map((target) => {
        const { label, Icon } = STATUS_BUTTONS[target];
        return (
          <SubmitButton
            key={target}
            variant={target === "handled" ? "primary" : "secondary"}
            name="status"
            value={target}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </SubmitButton>
        );
      })}
    </ActionForm>
  );
}

export function ResendNotificationButton({ id }: { id: string }) {
  return (
    <ActionForm action={resendNotificationAction}>
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="secondary">
        <Send className="size-4" aria-hidden="true" />
        Renvoyer la notification
      </SubmitButton>
    </ActionForm>
  );
}

export function DeleteMessageButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  return (
    <ActionForm
      action={deleteMessageAction}
      confirm={{
        title: `Supprimer le message de « ${name} » ?`,
        message:
          "Le message et les coordonnées de l'expéditeur seront effacés définitivement. Cette action est irréversible.",
      }}
    >
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="danger">
        <Trash2 className="size-4" aria-hidden="true" />
        Supprimer
      </SubmitButton>
    </ActionForm>
  );
}

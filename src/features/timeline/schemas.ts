import { z } from "zod";
import { optionalMediaId } from "@/features/media/schemas";
import { TIMELINE_ICON_KEYS } from "@/features/timeline/icons";
import { checkbox, idSchema, requiredText } from "@/lib/validation";

export const timelineEntrySchema = z.object({
  periodLabel: requiredText(40),
  title: requiredText(160),
  description: requiredText(5_000),
  iconKey: z.enum(TIMELINE_ICON_KEYS, { error: "Icône inconnue." }),
  // Illustration facultative ; l'icône reste le repli sans image.
  imageMediaId: optionalMediaId,
  isVisible: checkbox(),
});

export const timelineEntryUpdateSchema = timelineEntrySchema.extend({
  id: idSchema,
});

export type TimelineEntryInput = z.output<typeof timelineEntrySchema>;

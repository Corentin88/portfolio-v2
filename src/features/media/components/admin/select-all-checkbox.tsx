"use client";

import { useId } from "react";

/** Coche ou décoche tous les médias de la page associés au formulaire de déplacement. */
export function SelectAllCheckbox({ formId }: { formId: string }) {
  const id = useId();
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <input
        id={id}
        type="checkbox"
        onChange={(event) => {
          const checked = event.currentTarget.checked;
          document
            .querySelectorAll<HTMLInputElement>(
              `input[type="checkbox"][form="${formId}"][name="mediaIds"]`,
            )
            .forEach((input) => {
              input.checked = checked;
            });
        }}
        className="size-4 accent-royal"
      />
      <label htmlFor={id}>Tout cocher sur cette page</label>
    </span>
  );
}

"use client";

import type { ReactNode } from "react";
import { useActionFormContext } from "@/components/admin/action-form";
import { cn } from "@/lib/utils";

const controlClass =
  "w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-royal focus-visible:ring-2 focus-visible:ring-royal/40 focus-visible:outline-none aria-invalid:border-destructive";

type BaseFieldProps = {
  name: string;
  label: string;
  hint?: ReactNode;
  /** Préfixe d'identifiant, pour plusieurs formulaires du même type sur une page. */
  idPrefix?: string;
};

function useField(name: string, idPrefix = "") {
  const { fieldErrors, values } = useActionFormContext();
  const id = `${idPrefix}${name}`;
  const error = fieldErrors?.[name];
  return {
    id,
    error,
    submitted: values,
    describedBy: error ? `${id}-error` : undefined,
  };
}

function FieldShell({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type TextFieldProps = BaseFieldProps & {
  defaultValue?: string | null;
  maxLength: number;
  type?: "text" | "email" | "url" | "date";
  required?: boolean;
};

export function TextField({
  name,
  label,
  hint,
  idPrefix,
  defaultValue,
  maxLength,
  type = "text",
  required = false,
}: TextFieldProps) {
  const { id, error, submitted, describedBy } = useField(name, idPrefix);
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <input
        id={id}
        name={name}
        type={type}
        maxLength={maxLength}
        required={required}
        defaultValue={submitted?.[name] ?? defaultValue ?? ""}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(controlClass, "h-10")}
      />
    </FieldShell>
  );
}

type TextAreaFieldProps = BaseFieldProps & {
  defaultValue?: string | null;
  maxLength: number;
  rows?: number;
  required?: boolean;
};

export function TextAreaField({
  name,
  label,
  hint,
  idPrefix,
  defaultValue,
  maxLength,
  rows = 4,
  required = false,
}: TextAreaFieldProps) {
  const { id, error, submitted, describedBy } = useField(name, idPrefix);
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <textarea
        id={id}
        name={name}
        rows={rows}
        maxLength={maxLength}
        required={required}
        defaultValue={submitted?.[name] ?? defaultValue ?? ""}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(controlClass, "py-2 leading-relaxed")}
      />
    </FieldShell>
  );
}

type SelectFieldProps = BaseFieldProps & {
  defaultValue?: string | null;
  options: ReadonlyArray<{ value: string; label: string }>;
};

export function SelectField({
  name,
  label,
  hint,
  idPrefix,
  defaultValue,
  options,
}: SelectFieldProps) {
  const { id, error, submitted, describedBy } = useField(name, idPrefix);
  const selected = submitted?.[name] ?? defaultValue ?? "";
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <select
        // React 19 réinitialise le formulaire après l'action, et un <select> revient
        // alors à sa valeur par défaut DU MONTAGE (React ne met pas à jour
        // defaultSelected). Sans cette clé, publier puis modifier un autre champ
        // renvoyait l'ancien statut et dépubliait le projet en silence.
        key={selected}
        id={id}
        name={name}
        defaultValue={selected}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(controlClass, "h-10")}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

type CheckboxFieldProps = Omit<BaseFieldProps, "hint"> & {
  defaultChecked: boolean;
};

export function CheckboxField({
  name,
  label,
  idPrefix,
  defaultChecked,
}: CheckboxFieldProps) {
  const { id, submitted } = useField(name, idPrefix);
  // Après un échec, une case non cochée est simplement absente des valeurs soumises.
  const checked = submitted ? name in submitted : defaultChecked;
  return (
    <div className="flex items-center gap-2">
      <input
        id={id}
        name={name}
        type="checkbox"
        defaultChecked={checked}
        className="size-4 rounded border-input accent-royal"
      />
      <label htmlFor={id} className="text-sm">
        {label}
      </label>
    </div>
  );
}

type CheckboxGroupFieldProps = Omit<BaseFieldProps, "idPrefix"> & {
  idPrefix: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  defaultValues: readonly string[];
};

/**
 * Cases à cocher multiples d'un même nom. Les valeurs cochées arrivent jointes
 * par une virgule (formDataToObject) ; l'ordre d'affichage est l'ordre enregistré.
 */
export function CheckboxGroupField({
  name,
  label,
  hint,
  idPrefix,
  options,
  defaultValues,
}: CheckboxGroupFieldProps) {
  const { fieldErrors, values } = useActionFormContext();
  const error = fieldErrors?.[name];
  const checked = new Set(
    values ? (values[name] ?? "").split(",").filter(Boolean) : defaultValues,
  );
  const groupId = `${idPrefix}${name}`;

  return (
    <fieldset
      aria-describedby={error ? `${groupId}-error` : undefined}
      className="space-y-1.5"
    >
      <legend className="text-sm font-medium">{label}</legend>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {options.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun choix disponible.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {options.map((option) => {
            const id = `${groupId}-${option.value}`;
            return (
              <li key={option.value}>
                <input
                  id={id}
                  name={name}
                  type="checkbox"
                  value={option.value}
                  defaultChecked={checked.has(option.value)}
                  className="peer sr-only"
                />
                <label
                  htmlFor={id}
                  className="inline-flex cursor-pointer items-center rounded-full border border-border px-3 py-1 font-mono text-xs transition-colors peer-checked:border-royal peer-checked:bg-royal peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-royal/40 hover:bg-muted peer-checked:hover:bg-royal/90"
                >
                  {option.label}
                </label>
              </li>
            );
          })}
        </ul>
      )}
      {error ? (
        <p id={`${groupId}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

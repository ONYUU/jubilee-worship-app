"use client";

import { createContext, useContext, useId } from "react";

type AdminFieldErrorsContextValue = {
  fieldErrors: Record<string, string[]>;
  formId: string;
};

export const AdminFieldErrorsContext = createContext<AdminFieldErrorsContextValue | null>(null);

function normalizeIdPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-");
}

export function getAdminFieldId(formId: string, name: string): string {
  return `${formId}-field-${normalizeIdPart(name)}`;
}

export function useAdminField(name: string, hasHint = false) {
  const context = useContext(AdminFieldErrorsContext);
  const fallbackId = useId().replaceAll(":", "");
  const id = context ? getAdminFieldId(context.formId, name) : `${fallbackId}-field`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const errors = context?.fieldErrors[name] ?? [];
  const describedBy = [hasHint ? hintId : null, errors.length > 0 ? errorId : null]
    .filter(Boolean)
    .join(" ") || undefined;

  return {
    describedBy,
    errorId,
    errors,
    hasError: errors.length > 0,
    hintId,
    id
  };
}

function FieldErrors({ id, messages }: { id: string; messages: string[] }) {
  if (messages.length === 0) return null;

  return (
    <ul id={id} className="mt-1 space-y-1 text-xs font-normal text-danger">
      {messages.map((message, index) => (
        <li key={`${message}-${index}`}>{message}</li>
      ))}
    </ul>
  );
}

type FieldProps = {
  label: string;
  name: string;
  hint?: string;
  required?: boolean;
  defaultValue?: string | number | null;
  type?: React.HTMLInputTypeAttribute;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  readOnly?: boolean;
  autoComplete?: React.HTMLInputAutoCompleteAttribute;
  spellCheck?: boolean;
};

const inputClass =
  "mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-night-950 px-3 py-2 text-ivory-50 placeholder:text-stone-500 read-only:opacity-70";

export function TextField({
  label,
  name,
  hint,
  required,
  defaultValue,
  type = "text",
  min,
  max,
  step,
  readOnly,
  autoComplete,
  spellCheck
}: FieldProps) {
  const field = useAdminField(name, Boolean(hint));

  return (
    <div className="block text-sm font-semibold text-ivory-50">
      <label htmlFor={field.id}>{label}</label>
      <input
        id={field.id}
        className={inputClass}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ""}
        min={min}
        max={max}
        step={step}
        readOnly={readOnly}
        autoComplete={autoComplete}
        spellCheck={spellCheck}
        aria-invalid={field.hasError || undefined}
        aria-describedby={field.describedBy}
      />
      {hint ? <span id={field.hintId} className="mt-1 block text-xs font-normal text-stone-300">{hint}</span> : null}
      <FieldErrors id={field.errorId} messages={field.errors} />
    </div>
  );
}

export function TextAreaField({
  label,
  name,
  hint,
  required,
  defaultValue,
  rows = 5
}: Omit<FieldProps, "type"> & { rows?: number }) {
  const field = useAdminField(name, Boolean(hint));

  return (
    <div className="block text-sm font-semibold text-ivory-50">
      <label htmlFor={field.id}>{label}</label>
      <textarea
        id={field.id}
        className={`${inputClass} resize-y`}
        name={name}
        required={required}
        defaultValue={defaultValue ?? ""}
        rows={rows}
        aria-invalid={field.hasError || undefined}
        aria-describedby={field.describedBy}
      />
      {hint ? <span id={field.hintId} className="mt-1 block text-xs font-normal text-stone-300">{hint}</span> : null}
      <FieldErrors id={field.errorId} messages={field.errors} />
    </div>
  );
}

export function SelectField({
  label,
  name,
  defaultValue,
  options,
  hint
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  options: Array<{ value: string; label: string }>;
  hint?: string;
}) {
  const field = useAdminField(name, Boolean(hint));

  return (
    <div className="block text-sm font-semibold text-ivory-50">
      <label htmlFor={field.id}>{label}</label>
      <select
        id={field.id}
        className={inputClass}
        name={name}
        defaultValue={defaultValue ?? options[0]?.value}
        aria-invalid={field.hasError || undefined}
        aria-describedby={field.describedBy}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint ? <span id={field.hintId} className="mt-1 block text-xs font-normal text-stone-300">{hint}</span> : null}
      <FieldErrors id={field.errorId} messages={field.errors} />
    </div>
  );
}

export function CheckboxField({
  label,
  name,
  defaultChecked = false,
  hint
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
  hint?: string;
}) {
  const field = useAdminField(name, Boolean(hint));

  return (
    <div>
      <label className="flex min-h-12 items-start gap-3 rounded-xl border border-white/10 bg-night-950/50 px-4 py-3 text-sm text-ivory-50">
        <input
          id={field.id}
          className="mt-1 size-5 accent-brand-sky"
          name={name}
          type="checkbox"
          defaultChecked={defaultChecked}
          aria-invalid={field.hasError || undefined}
          aria-describedby={field.describedBy}
        />
        <span>
          <span className="font-semibold">{label}</span>
          {hint ? <span id={field.hintId} className="mt-1 block text-xs text-stone-300">{hint}</span> : null}
        </span>
      </label>
      <FieldErrors id={field.errorId} messages={field.errors} />
    </div>
  );
}

export function FormSection({
  title,
  description,
  children
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-4 rounded-2xl border border-white/10 bg-night-900/50 p-5">
      <legend className="px-2 text-lg font-bold text-ivory-50">{title}</legend>
      {description ? <p className="text-sm text-stone-300">{description}</p> : null}
      {children}
    </fieldset>
  );
}

"use client";

import { useActionState, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { AdminFieldErrorsContext, getAdminFieldId } from "@/components/admin/admin-fields";
import { redactReinstallRecoveryCode } from "@/lib/admin/reinstall-recovery-browser";
import type { ActionState } from "@/lib/auth/types";
import { INITIAL_ACTION_STATE } from "@/lib/auth/types";

type AdminFormProps = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  submitLabel: string;
  className?: string;
  confirmMessage?: string;
  resetOnSettled?: boolean;
  sensitiveTransform?: "reinstall-recovery-code";
};

function SubmitButton({ label, actionPending }: { label: string; actionPending: boolean }) {
  const { pending: formPending } = useFormStatus();
  const pending = formPending || actionPending;

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-12 items-center justify-center rounded-xl bg-ivory-50 px-5 py-3 font-bold text-night-950 transition hover:bg-brand-sun disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? "저장 중…" : label}
    </button>
  );
}

export function AdminForm({
  action,
  children,
  submitLabel,
  className = "",
  confirmMessage,
  resetOnSettled = false,
  sensitiveTransform
}: AdminFormProps) {
  const sensitiveSubmissionLockedRef = useRef(false);
  const [sensitivePending, setSensitivePending] = useState(false);
  const transformedAction = useCallback(async (
    previousState: ActionState,
    formData: FormData
  ): Promise<ActionState> => {
    try {
      if (sensitiveTransform === "reinstall-recovery-code") {
        await redactReinstallRecoveryCode(formData);
      }
      return await action(previousState, formData);
    } finally {
      sensitiveSubmissionLockedRef.current = false;
      setSensitivePending(false);
    }
  }, [action, sensitiveTransform]);
  const [state, formAction, actionPending] = useActionState(
    sensitiveTransform ? transformedAction : action,
    INITIAL_ACTION_STATE
  );
  const errors = Object.entries(state.fieldErrors ?? {});
  const formId = useId().replaceAll(":", "");
  const summaryRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fieldContext = useMemo(
    () => ({ fieldErrors: state.fieldErrors ?? {}, formId }),
    [formId, state.fieldErrors]
  );
  const clearSettledForm = useCallback(() => {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement && formRef.current?.contains(activeElement)) {
      activeElement.blur();
    }
    formRef.current?.reset();
  }, []);

  useEffect(() => {
    if (state.status === "error") {
      summaryRef.current?.focus();
    }
  }, [state.status, state.message, state.fieldErrors]);

  useEffect(() => {
    if (!resetOnSettled || state.status === "idle") return;
    clearSettledForm();
  }, [clearSettledForm, resetOnSettled, state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className={`space-y-6 ${className}`}
      noValidate
      onSubmit={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage)) {
          event.preventDefault();
          if (resetOnSettled) clearSettledForm();
          return;
        }
        if (sensitiveTransform) {
          if (sensitiveSubmissionLockedRef.current) {
            event.preventDefault();
            return;
          }
          sensitiveSubmissionLockedRef.current = true;
          setSensitivePending(true);
        }
      }}
    >
      <AdminFieldErrorsContext.Provider value={fieldContext}>
        {children}
      </AdminFieldErrorsContext.Provider>
      {state.status !== "idle" ? (
        <div
          ref={summaryRef}
          role={state.status === "error" ? "alert" : "status"}
          aria-live="polite"
          tabIndex={state.status === "error" ? -1 : undefined}
          className={`rounded-xl border px-4 py-3 text-sm ${
            state.status === "error"
              ? "border-danger/50 bg-danger/10 text-ivory-50"
              : "border-success/50 bg-success/10 text-ivory-50"
          }`}
        >
          <p className="font-semibold">{state.message}</p>
          {errors.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {errors.flatMap(([field, messages]) =>
                messages.map((message, index) => (
                  <li key={`${field}-${message}-${index}`}>
                    <a className="underline underline-offset-2" href={`#${getAdminFieldId(formId, field)}`}>
                      {field}: {message}
                    </a>
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </div>
      ) : null}
      <SubmitButton
        label={submitLabel}
        actionPending={actionPending || sensitivePending}
      />
    </form>
  );
}

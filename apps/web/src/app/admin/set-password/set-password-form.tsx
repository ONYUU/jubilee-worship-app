"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { useFormStatus } from "react-dom";
import { INITIAL_ACTION_STATE } from "@/lib/auth/types";
import { setInvitedAdminPasswordAction } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-12 w-full rounded-xl bg-ivory-50 px-4 py-3 font-bold text-night-950 hover:bg-brand-sun disabled:opacity-60"
    >
      {pending ? "설정 중…" : "비밀번호 설정 완료"}
    </button>
  );
}

export function SetPasswordForm() {
  const [state, action] = useActionState(setInvitedAdminPasswordAction, INITIAL_ACTION_STATE);
  const passwordId = useId();
  const confirmationId = useId();
  const errorId = useId();
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status === "error") errorRef.current?.focus();
  }, [state.status, state.message]);

  return (
    <form action={action} className="mt-8 space-y-5" noValidate>
      <label htmlFor={passwordId} className="block text-sm font-semibold">
        새 비밀번호
        <input
          id={passwordId}
          className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-night-950 px-3"
          name="password"
          type="password"
          minLength={12}
          maxLength={128}
          autoComplete="new-password"
          required
          aria-invalid={state.fieldErrors?.password ? true : undefined}
          aria-describedby={state.status === "error" ? errorId : undefined}
        />
      </label>
      <label htmlFor={confirmationId} className="block text-sm font-semibold">
        새 비밀번호 확인
        <input
          id={confirmationId}
          className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-night-950 px-3"
          name="password_confirmation"
          type="password"
          minLength={12}
          maxLength={128}
          autoComplete="new-password"
          required
          aria-invalid={state.fieldErrors?.password_confirmation ? true : undefined}
          aria-describedby={state.status === "error" ? errorId : undefined}
        />
      </label>
      <p className="text-xs text-stone-300">다른 서비스와 중복되지 않는 12자 이상의 비밀번호를 사용하세요.</p>
      {state.status === "error" ? (
        <div
          ref={errorRef}
          id={errorId}
          role="alert"
          aria-live="polite"
          tabIndex={-1}
          className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm"
        >
          {state.message}
        </div>
      ) : null}
      <SubmitButton />
    </form>
  );
}

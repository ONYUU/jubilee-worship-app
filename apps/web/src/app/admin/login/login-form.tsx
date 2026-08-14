"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { useFormStatus } from "react-dom";
import { INITIAL_ACTION_STATE } from "@/lib/auth/types";
import { loginAction } from "./actions";

function LoginButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-12 w-full rounded-xl bg-ivory-50 px-4 py-3 font-bold text-night-950 hover:bg-brand-sun disabled:opacity-60"
    >
      {pending ? "로그인 중…" : "로그인"}
    </button>
  );
}

export function LoginForm() {
  const [state, action] = useActionState(loginAction, INITIAL_ACTION_STATE);
  const emailId = useId();
  const passwordId = useId();
  const errorId = useId();
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (state.status === "error") errorRef.current?.focus();
  }, [state.status, state.message]);

  return (
    <form action={action} className="mt-8 space-y-5" noValidate>
      <label htmlFor={emailId} className="block text-sm font-semibold">
        이메일
        <input
          id={emailId}
          className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-night-950 px-3"
          name="email"
          type="email"
          autoComplete="username"
          required
          aria-invalid={state.fieldErrors?.email ? true : undefined}
          aria-describedby={state.status === "error" ? errorId : undefined}
        />
      </label>
      <label htmlFor={passwordId} className="block text-sm font-semibold">
        비밀번호
        <input
          id={passwordId}
          className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-night-950 px-3"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={state.fieldErrors?.password ? true : undefined}
          aria-describedby={state.status === "error" ? errorId : undefined}
        />
      </label>
      {state.status === "error" ? (
        <p
          ref={errorRef}
          id={errorId}
          role="alert"
          aria-live="polite"
          tabIndex={-1}
          className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm"
        >
          {state.message}
        </p>
      ) : null}
      <LoginButton />
    </form>
  );
}

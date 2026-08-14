"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/auth/types";
import { INITIAL_ACTION_STATE } from "@/lib/auth/types";

function SubmitButton({ label, tone }: { label: string; tone: "default" | "danger" }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`min-h-11 rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-60 ${
        tone === "danger"
          ? "border-danger/40 text-danger hover:bg-danger/10"
          : "border-brand-sky/60 text-ivory-50 hover:bg-brand-sky/10"
      }`}
    >
      {pending ? "처리 중…" : label}
    </button>
  );
}

export function AdminActionButton({
  action,
  id,
  label,
  confirmMessage,
  tone = "default"
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  id: number | string;
  label: string;
  confirmMessage?: string;
  tone?: "default" | "danger";
}) {
  const [state, formAction] = useActionState(action, INITIAL_ACTION_STATE);
  return (
    <div>
      <form
        action={formAction}
        onSubmit={(event) => {
          if (confirmMessage && !window.confirm(confirmMessage)) event.preventDefault();
        }}
      >
        <input type="hidden" name="id" value={id} />
        <SubmitButton label={label} tone={tone} />
      </form>
      {state.status !== "idle" ? (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={`mt-1 max-w-64 text-xs ${state.status === "error" ? "text-danger" : "text-success"}`}
        >
          {state.message}
        </p>
      ) : null}
    </div>
  );
}

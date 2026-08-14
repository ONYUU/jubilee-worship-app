"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/auth/types";
import { INITIAL_ACTION_STATE } from "@/lib/auth/types";

function DeleteSubmit({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-11 rounded-lg border border-danger/40 px-3 py-2 text-sm font-semibold text-danger hover:bg-danger/10 disabled:opacity-60"
    >
      {pending ? "처리 중…" : label}
    </button>
  );
}

export function DeleteButton({
  action,
  id,
  label = "삭제",
  confirmMessage = "이 콘텐츠를 삭제할까요? 삭제한 내용은 공개 화면에서 사라집니다."
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  id: number;
  label?: string;
  confirmMessage?: string;
}) {
  const [state, formAction] = useActionState(action, INITIAL_ACTION_STATE);

  return (
    <div>
      <form
        action={formAction}
        onSubmit={(event) => {
          if (!window.confirm(confirmMessage)) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="id" value={id} />
        <DeleteSubmit label={label} />
      </form>
      {state.status === "error" ? (
        <p role="alert" className="mt-1 max-w-48 text-xs text-danger">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}

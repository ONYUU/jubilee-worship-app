"use client";

import { AdminForm } from "../../../../src/components/admin/admin-form";
import { FormSection, TextField } from "../../../../src/components/admin/admin-fields";
import type { ActionState } from "../../../../src/lib/auth/types";

export function SensitiveAdminFormHarness({
  action
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  return (
    <AdminForm
      action={action}
      submitLabel="보안 전송 시험"
      sensitiveTransform="reinstall-recovery-code"
    >
      <input type="hidden" name="challenge_id" value="71000000-0000-4000-8000-000000000001" />
      <FormSection title="민감 폼 시험">
        <TextField
          label="재설치 복구 코드"
          name="recovery_code"
          required
          type="password"
          autoComplete="off"
        />
      </FormSection>
    </AdminForm>
  );
}

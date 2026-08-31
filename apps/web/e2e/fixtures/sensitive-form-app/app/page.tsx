import type { ActionState } from "../../../../src/lib/auth/types";
import { SensitiveAdminFormHarness } from "./harness";

async function inspectSensitivePayload(
  _state: ActionState,
  formData: FormData
): Promise<ActionState> {
  "use server";

  await new Promise((resolve) => setTimeout(resolve, 1_200));
  return {
    status: "success",
    message: JSON.stringify({
      hasRawCode: formData.has("recovery_code"),
      digest: formData.get("recovery_code_digest")
    })
  };
}

export default function Page() {
  return (
    <main>
      <SensitiveAdminFormHarness action={inspectSensitivePayload} />
    </main>
  );
}

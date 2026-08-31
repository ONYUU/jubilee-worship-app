import { createHash } from "node:crypto";

const RECOVERY_CODE_DIGEST_DOMAIN = "jubilee:reinstall-recovery:v1";

/**
 * Hash the normalized, 128-bit Crockford Base32 capability before it leaves
 * the Next.js server action. The raw one-time code is never sent to Supabase,
 * returned to the browser, or persisted by the application.
 */
export function reinstallRecoveryCodeDigest(normalizedRecoveryCode: string): string {
  return createHash("sha256")
    .update(`${RECOVERY_CODE_DIGEST_DOMAIN}\n${normalizedRecoveryCode}`, "utf8")
    .digest("hex");
}

const RECOVERY_CODE_DIGEST_DOMAIN = "jubilee:reinstall-recovery:v1";

export function normalizeReinstallRecoveryCodeInput(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;

  const normalized = value
    .trim()
    .toUpperCase()
    .replaceAll("-", "")
    .replaceAll(" ", "")
    .replaceAll("O", "0")
    .replace(/[IL]/g, "1");

  return /^[0-9A-HJKMNP-TV-Z]{26}$/.test(normalized) ? normalized : null;
}

export async function reinstallRecoveryCodeDigestInBrowser(
  normalizedRecoveryCode: string
): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("Web Crypto is unavailable");

  const digest = await subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${RECOVERY_CODE_DIGEST_DOMAIN}\n${normalizedRecoveryCode}`)
  );

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Removes the one-time code before invoking the Server Action. Only the
 * domain-separated digest crosses the browser-to-Vercel request boundary.
 */
export async function redactReinstallRecoveryCode(
  formData: FormData
): Promise<FormData> {
  const normalized = normalizeReinstallRecoveryCodeInput(formData.get("recovery_code"));
  formData.delete("recovery_code");
  formData.set(
    "recovery_code_digest",
    normalized ? await reinstallRecoveryCodeDigestInBrowser(normalized) : ""
  );
  return formData;
}

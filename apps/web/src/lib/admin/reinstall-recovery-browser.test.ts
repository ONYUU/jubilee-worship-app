import { describe, expect, it } from "vitest";
import { reinstallRecoveryCodeDigest } from "./reinstall-recovery";
import {
  normalizeReinstallRecoveryCodeInput,
  redactReinstallRecoveryCode,
  reinstallRecoveryCodeDigestInBrowser
} from "./reinstall-recovery-browser";

describe("browser-side reinstall recovery redaction", () => {
  it("normalizes Crockford ambiguities and rejects malformed values", () => {
    expect(normalizeReinstallRecoveryCodeInput("7m4k-9p2t-8w3x-6y5z-1a2b-3c4d-5e")).toBe(
      "7M4K9P2T8W3X6Y5Z1A2B3C4D5E"
    );
    expect(normalizeReinstallRecoveryCodeInput("short-code")).toBeNull();
  });

  it("matches the server reference digest", async () => {
    const normalized = "7M4K9P2T8W3X6Y5Z1A2B3C4D5E";
    await expect(reinstallRecoveryCodeDigestInBrowser(normalized)).resolves.toBe(
      reinstallRecoveryCodeDigest(normalized)
    );
  });

  it("removes the raw code before the Server Action payload is built", async () => {
    const formData = new FormData();
    formData.set("challenge_id", "71000000-0000-4000-8000-000000000001");
    formData.set("recovery_code", "7M4K-9P2T-8W3X-6Y5Z-1A2B-3C4D-5E");

    const redacted = await redactReinstallRecoveryCode(formData);

    expect(redacted.has("recovery_code")).toBe(false);
    expect(redacted.get("recovery_code_digest")).toBe(
      reinstallRecoveryCodeDigest("7M4K9P2T8W3X6Y5Z1A2B3C4D5E")
    );
  });
});

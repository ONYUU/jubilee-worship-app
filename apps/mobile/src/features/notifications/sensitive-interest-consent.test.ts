import { describe, expect, it } from "vitest";

import {
  CURRENT_SENSITIVE_INTEREST_CONSENT_RECORD,
  CURRENT_SENSITIVE_INTEREST_CONSENT_VERSION,
  CURRENT_SENSITIVE_INTEREST_DISCLOSURE_SHA256,
  hasCurrentSensitiveInterestConsent,
  isCurrentSensitiveInterestConsentRecord,
  parseCurrentSensitiveInterestConsent,
  SENSITIVE_INTEREST_AGE_CONFIRMATION_LABEL,
  SENSITIVE_INTEREST_CONSENT_DISCLOSURE,
  SENSITIVE_INTEREST_CONSENT_TITLE,
  serializeCurrentSensitiveInterestConsent
} from "./sensitive-interest-consent";

describe("sensitive-interest notification consent", () => {
  it("accepts only the current exact consent record", () => {
    expect(hasCurrentSensitiveInterestConsent(CURRENT_SENSITIVE_INTEREST_CONSENT_RECORD)).toBe(true);
    expect(hasCurrentSensitiveInterestConsent(CURRENT_SENSITIVE_INTEREST_CONSENT_VERSION)).toBe(false);
    expect(hasCurrentSensitiveInterestConsent("sensitive-interest-notifications-v0")).toBe(false);
    expect(hasCurrentSensitiveInterestConsent(undefined)).toBe(false);
  });

  it("pins the exact Korean disclosure to its consent version", async () => {
    const digest = await globalThis.crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(SENSITIVE_INTEREST_CONSENT_DISCLOSURE)
    );
    const hex = Array.from(new Uint8Array(digest), (value) =>
      value.toString(16).padStart(2, "0")
    ).join("");
    expect(hex).toBe(CURRENT_SENSITIVE_INTEREST_DISCLOSURE_SHA256);
  });

  it("stores version, disclosure digest, and locale together", () => {
    expect(parseCurrentSensitiveInterestConsent(
      serializeCurrentSensitiveInterestConsent()
    )).toEqual(CURRENT_SENSITIVE_INTEREST_CONSENT_RECORD);
    expect(parseCurrentSensitiveInterestConsent(
      CURRENT_SENSITIVE_INTEREST_CONSENT_VERSION
    )).toBeNull();
    expect(parseCurrentSensitiveInterestConsent(JSON.stringify({
      ...CURRENT_SENSITIVE_INTEREST_CONSENT_RECORD,
      disclosureSha256: "0".repeat(64)
    }))).toBeNull();
    expect(parseCurrentSensitiveInterestConsent(JSON.stringify({
      ...CURRENT_SENSITIVE_INTEREST_CONSENT_RECORD,
      age14OrOverConfirmed: false
    }))).toBeNull();
    expect(isCurrentSensitiveInterestConsentRecord({
      ...CURRENT_SENSITIVE_INTEREST_CONSENT_RECORD,
      age14OrOverConfirmed: false
    })).toBe(false);
    expect(CURRENT_SENSITIVE_INTEREST_CONSENT_RECORD.age14OrOverConfirmed).toBe(true);
  });

  it("names the separate sensitive-information consent in the title", () => {
    expect(SENSITIVE_INTEREST_CONSENT_TITLE).toContain("민감정보(종교적 관심)");
    expect(SENSITIVE_INTEREST_CONSENT_TITLE).toContain("별도 동의");
  });

  it("requires a notification-only 14+ affirmation without collecting birth date", () => {
    expect(SENSITIVE_INTEREST_AGE_CONFIRMATION_LABEL).toBe("만 14세 이상입니다");
    expect(SENSITIVE_INTEREST_CONSENT_DISCLOSURE).toContain("만 14세 이상만");
    expect(SENSITIVE_INTEREST_CONSENT_DISCLOSURE).toContain("생년월일은 수집하지 않습니다");
    expect(SENSITIVE_INTEREST_CONSENT_DISCLOSURE).toContain("만 14세 미만");
    expect(SENSITIVE_INTEREST_CONSENT_DISCLOSURE).toContain("앱의 다른 기능");
    expect(SENSITIVE_INTEREST_CONSENT_DISCLOSURE).toContain("만 14세 이상 확인 여부");
    expect(SENSITIVE_INTEREST_CONSENT_DISCLOSURE).toContain("서버 확인 시각");
  });

  it("prominently discloses the sensitive inference, processors, purpose and choice", () => {
    for (const term of [
      "종교적 관심",
      "무작위 설치 식별자",
      "Expo 푸시 토큰",
      "동의 버전",
      "동의 시각",
      "Supabase",
      "Apple 또는 Google",
      "광고·추적·프로파일링",
      "다른 기능",
      "철회",
      "서버 요청이 성공한 시점",
      "최대 30일",
      "최대 90일"
    ]) {
      expect(SENSITIVE_INTEREST_CONSENT_DISCLOSURE).toContain(term);
    }
  });
});

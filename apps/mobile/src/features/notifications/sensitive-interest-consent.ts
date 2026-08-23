import { SENSITIVE_INTEREST_NOTIFICATION_CONSENT } from "@jubilee/domain";

export const CURRENT_SENSITIVE_INTEREST_CONSENT_VERSION =
  SENSITIVE_INTEREST_NOTIFICATION_CONSENT.version;
export const CURRENT_SENSITIVE_INTEREST_CONSENT_LOCALE =
  SENSITIVE_INTEREST_NOTIFICATION_CONSENT.locale;
export const CURRENT_SENSITIVE_INTEREST_DISCLOSURE_SHA256 =
  SENSITIVE_INTEREST_NOTIFICATION_CONSENT.disclosureSha256;

export const SENSITIVE_INTEREST_CONSENT_TITLE =
  "민감정보(종교적 관심) 알림 처리 별도 동의";

export const SENSITIVE_INTEREST_AGE_CONFIRMATION_LABEL =
  "만 14세 이상입니다";

export const SENSITIVE_INTEREST_CONSENT_DISCLOSURE =
  "알림은 만 14세 이상만 사용할 수 있습니다. ‘만 14세 이상입니다’ 확인과 별도 동의를 모두 완료한 경우에만 알림을 등록하며, 생년월일은 수집하지 않습니다. 만 14세 미만은 알림 기능을 사용할 수 없지만 앱의 다른 기능은 이용할 수 있습니다. 알림 선택은 예배에 대한 종교적 관심을 드러낼 수 있습니다. 동의하면 Supabase는 무작위 설치 식별자, 재사용할 수 없도록 해시한 설치 검증값, Expo 푸시 토큰과 해시, 플랫폼·앱 버전·앱 구분, 선택한 알림 종류, 동의 버전·고지문 해시·언어·서버 동의 시각, 만 14세 이상 확인 여부·서버 확인 시각, 최종 연결 시각, 알림 제목·본문·딥링크, 대상 종류·관련 예배 일정, 발송 승인·대기 상태, 설치별 발송 시도, Expo 티켓·영수증과 전달·오류 상태를 알림 등록·선택 유지·중복 발송 방지·배송 오류 처리에 사용합니다. Expo는 Expo 푸시 토큰을 발급·갱신할 때 운영체제 기기 푸시 토큰(APNs 또는 FCM), Expo 앱 설치 식별자, 프로젝트·앱 식별정보, 푸시 서비스 종류, 개발·운영 구분과 요청 IP 주소·운영체제·오류·성능 정보를 처리할 수 있습니다. 실제 알림 발송 때 Expo는 Expo 푸시 토큰, 알림 제목·본문·딥링크, 티켓·영수증·오류 정보를 처리하고 이를 Apple 또는 Google의 푸시 서비스로 전달합니다. Apple 또는 Google은 운영체제 기기 푸시 토큰, 앱 식별정보, 알림 제목·본문·딥링크와 전달 메타데이터를 기기로 전달하기 위해 처리합니다. 이 정보는 이름·이메일·광고 식별자와 결합하거나 광고·추적·이용자 프로파일링에 사용하지 않습니다. 마지막 알림을 끄거나 등록 해제를 선택하면 이 기기의 동의·알림 표시를 즉시 끄고 서버 요청이 성공한 시점에 푸시 토큰 원문·해시와 기기 인증 연결을 즉시 삭제합니다. 철회할 때 앱은 Expo의 운영체제 토큰 자동 갱신을 끄고 APNs 또는 FCM 기기 토큰 등록 해제를 요청합니다. 서버 또는 외부 푸시 제공자 정리 중 어느 단계든 실패하면 기기 보안저장소에 정리 대기 상태를 남겨 다음 실행에서 다시 시도합니다. 비활성·연결 해제된 설치정보와 동의 이력은 30일이 경과한 뒤 매일 실행하는 삭제 작업에서 삭제하며, 발송 상세기록은 90일이 경과한 뒤 같은 작업에서 삭제합니다. 삭제 작업은 매일 1회 실행되므로 실제 삭제 시점은 각 기간이 지난 후의 다음 실행 시점이며, 작업 지연이나 처리 적체가 있으면 더 늦어질 수 있습니다. 철회 요청 처리 전 또는 처리 중 이미 발송 작업에 넘겨진 알림은 외부 서비스로 전달되어 이후 도착할 수 있지만, 처리 완료 후 새 발송 대상에서는 제외합니다. 동의하지 않아도 앱의 다른 기능은 그대로 이용할 수 있고, 언제든 이 화면에서 철회할 수 있습니다.";

export type SensitiveInterestConsentRecord = {
  version: typeof CURRENT_SENSITIVE_INTEREST_CONSENT_VERSION;
  disclosureSha256: typeof CURRENT_SENSITIVE_INTEREST_DISCLOSURE_SHA256;
  locale: typeof CURRENT_SENSITIVE_INTEREST_CONSENT_LOCALE;
  age14OrOverConfirmed: true;
};

export const CURRENT_SENSITIVE_INTEREST_CONSENT_RECORD: SensitiveInterestConsentRecord = {
  version: CURRENT_SENSITIVE_INTEREST_CONSENT_VERSION,
  disclosureSha256: CURRENT_SENSITIVE_INTEREST_DISCLOSURE_SHA256,
  locale: CURRENT_SENSITIVE_INTEREST_CONSENT_LOCALE,
  age14OrOverConfirmed: true
};

export function serializeCurrentSensitiveInterestConsent(): string {
  return JSON.stringify(CURRENT_SENSITIVE_INTEREST_CONSENT_RECORD);
}

export function parseCurrentSensitiveInterestConsent(
  raw: string | null
): SensitiveInterestConsentRecord | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const candidate = value as Record<string, unknown>;
    return candidate.version === CURRENT_SENSITIVE_INTEREST_CONSENT_VERSION
      && candidate.disclosureSha256 === CURRENT_SENSITIVE_INTEREST_DISCLOSURE_SHA256
      && candidate.locale === CURRENT_SENSITIVE_INTEREST_CONSENT_LOCALE
      && candidate.age14OrOverConfirmed === true
      ? CURRENT_SENSITIVE_INTEREST_CONSENT_RECORD
      : null;
  } catch {
    // A legacy version-only value is deliberately invalidated fail-closed.
    return null;
  }
}

export function isCurrentSensitiveInterestConsentRecord(
  value: unknown
): value is SensitiveInterestConsentRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return candidate.version === CURRENT_SENSITIVE_INTEREST_CONSENT_VERSION
    && candidate.disclosureSha256 === CURRENT_SENSITIVE_INTEREST_DISCLOSURE_SHA256
    && candidate.locale === CURRENT_SENSITIVE_INTEREST_CONSENT_LOCALE
    && candidate.age14OrOverConfirmed === true;
}

export function hasCurrentSensitiveInterestConsent(
  value: unknown
): value is SensitiveInterestConsentRecord {
  return isCurrentSensitiveInterestConsentRecord(value);
}

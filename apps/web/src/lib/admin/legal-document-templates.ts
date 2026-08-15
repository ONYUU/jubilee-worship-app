import { SERVICE_IDENTITY, WORSHIP_REMINDER_SCHEDULE } from "@/lib/site-identity";

export const LEGAL_REVIEW_MARKER = "[[오너 확인 필요]]";

export type LegalDocumentType = "privacy_policy" | "terms_of_service";

type LegalDocumentTemplate = {
  title: string;
  body: string;
};

const privacyPolicyBody = `개인정보처리방침

1. 운영주체와 문의처
서비스 운영주체는 ${SERVICE_IDENTITY.operatorName}입니다.
개인정보 및 앱 이용 문의: ${SERVICE_IDENTITY.contactEmail}

2. 일반 앱 이용
앱은 일반 사용자의 회원가입을 받지 않으며, 이름·이메일·전화번호·위치정보를 직접 입력받지 않습니다.

3. 알림 이용 시 처리하는 정보
사용자가 알림을 직접 켜면 무작위 설치 식별자, 기기 푸시 토큰, 플랫폼(iOS또는 Android), 앱 버전, 알림 선택 설정과 최종 연결 시각을 처리합니다. 설치 비밀값 원문은 기기에 보관하고, 서버에는 해시값만 저장합니다.

4. 처리 목적
위 정보는 예배 일정·일정 변경·송리스트 알림 제공, 알림 선택 유지, 중복 발송 방지와 배송 오류 처리에만 사용합니다. 예배 알림은 ${WORSHIP_REMINDER_SCHEDULE.dayBeforeLabel}과 ${WORSHIP_REMINDER_SCHEDULE.oneHourBeforeLabel}에 발송하는 것을 운영 기준으로 합니다.
예배 알림 선택은 종교적 관심을 추론할 수 있는 정보로 보수적으로 보호합니다. 이름·이메일·전화번호·광고 식별자와 결합하지 않고, 광고·추적·이용자 프로파일링에 사용하지 않습니다.

5. 보유·파기
사용자가 알림 해제를 요청하거나 푸시 제공자가 무효 토큰으로 판정하면 알림 선택을 끄고 푸시 토큰 원문을 최대 24시간 이내에 삭제합니다. 180일 동안 활동이 확인되지 않은 설치는 비활성화하고, 그 후 30일 동안 재등록하지 않으면 설치 정보를 삭제합니다.
비활성 정보 보유 기간: 비활성화 후 최대 30일
발송 기록 보유 기간: 발송 상세기록 최대 90일
정기 삭제 주기: 매일 1회

6. 외부 서비스와 국외 처리
앱은 콘텐츠·알림 제공을 위해 Supabase, Expo Push Service 등 외부 서비스를 사용할 수 있습니다.
수탁자: ${LEGAL_REVIEW_MARKER}
이전 국가: ${LEGAL_REVIEW_MARKER}
이전 항목: ${LEGAL_REVIEW_MARKER}
이전 시점 및 방법: ${LEGAL_REVIEW_MARKER}
국외 처리 보유 기간: ${LEGAL_REVIEW_MARKER}
이전 거부 방법 및 효과: ${LEGAL_REVIEW_MARKER}

7. 이용자의 선택과 권리
사용자는 앱의 알림 설정에서 알림 종류별 수신 여부를 변경할 수 있고, 기기 설정에서 알림 권한을 철회할 수 있습니다. 추가 요청은 위 문의처로 접수할 수 있습니다.

8. 시행일
이 방침의 시행일은 관리자가 승인한 문서 상단의 효력일과 같습니다.`;

const termsBody = `서비스 이용약관

1. 운영주체와 문의처
서비스 운영주체는 ${SERVICE_IDENTITY.operatorName}입니다.
서비스 문의: ${SERVICE_IDENTITY.contactEmail}

2. 서비스 범위
앱은 예배 일정, 설교 주제와 말씀 구절, 송리스트, 공지, 미디어와 방문 안내를 제공합니다. 예배 일정과 콘텐츠는 운영 사정에 따라 변경될 수 있으므로 앱의 최신 공지를 확인해야 합니다.

3. 알림과 외부 연결
알림은 사용자가 직접 동의한 종류만 제공합니다. 외부 영상·지도·SNS 링크를 선택하면 해당 서비스의 약관과 정책이 적용됩니다.

4. 이용자의 책임
이용자는 서비스를 법령과 상식에 맞게 이용하며, 앱 또는 외부 연결을 오용하여 타인의 권리를 침해해서는 안 됩니다.

5. 서비스 변경·중단
안전성, 보안, 외부 서비스 상태 또는 운영상 필요에 따라 기능의 일부가 변경되거나 일시 중단될 수 있습니다. 중요한 변경은 가능한 범위에서 앱 또는 공식 채널로 안내합니다.

6. 준거법과 분쟁 처리
준거법: ${LEGAL_REVIEW_MARKER}
관할: ${LEGAL_REVIEW_MARKER}
면책 범위: ${LEGAL_REVIEW_MARKER}
미성년자 이용 안내: ${LEGAL_REVIEW_MARKER}

7. 시행일
이 약관의 시행일은 관리자가 승인한 문서 상단의 효력일과 같습니다.`;

const LEGAL_DOCUMENT_TEMPLATES: Record<LegalDocumentType, LegalDocumentTemplate> = {
  privacy_policy: {
    title: "쥬빌리워십 앱 개인정보처리방침",
    body: privacyPolicyBody
  },
  terms_of_service: {
    title: "쥬빌리워십 앱 이용약관",
    body: termsBody
  }
};

export function getLegalDocumentTemplate(documentType: LegalDocumentType): LegalDocumentTemplate {
  return LEGAL_DOCUMENT_TEMPLATES[documentType];
}

export function hasUnresolvedLegalReview(body: string): boolean {
  return body.includes(LEGAL_REVIEW_MARKER);
}

export function hasConfirmedServiceIdentity(body: string): boolean {
  return body.includes(SERVICE_IDENTITY.operatorName) && body.includes(SERVICE_IDENTITY.contactEmail);
}

export function hasRequiredAppPrivacyDisclosures(body: string): boolean {
  return ["설치 식별자", "푸시 토큰", "알림 선택", "종교적 관심", "보유", "비활성화"].every((term) =>
    body.includes(term)
  );
}

const PRIVACY_OPERATIONAL_LABELS = [
  "비활성 정보 보유 기간:",
  "발송 기록 보유 기간:",
  "정기 삭제 주기:",
  "수탁자:",
  "이전 국가:",
  "이전 항목:",
  "이전 시점 및 방법:",
  "국외 처리 보유 기간:",
  "이전 거부 방법 및 효과:"
] as const;

const TERMS_OPERATIONAL_LABELS = [
  "준거법:",
  "관할:",
  "면책 범위:",
  "미성년자 이용 안내:"
] as const;

const PLACEHOLDER_VALUE_PATTERN = /\[\[|\]\]|미정|추후|확인|검토|확정|완료|입력|기입|작성/i;
const PLACEHOLDER_ONLY_VALUE_PATTERN = /^(?:(?:최종\s*)?(?:검토\s*)?완료(?:됨)?|(?:최종\s*)?확정(?:됨)?|검토\s*됨|N\/?A|해당\s*없음)[:.!]?$/i;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasCompletedLabeledValues(body: string, labels: readonly string[]): boolean {
  const lines = body.replaceAll("\r\n", "\n").split("\n");
  return labels.every((label) => {
    const matcher = new RegExp(`^\\s*(?:[-*]\\s*)?${escapeRegExp(label)}\\s*(.*)$`);
    const matches = lines.map((line) => line.match(matcher)).filter((match) => match !== null);
    if (matches.length !== 1) return false;
    const value = matches[0]?.[1]?.trim() ?? "";
    return value.length >= 2
      && /[0-9A-Za-z가-힣]/.test(value)
      && !PLACEHOLDER_VALUE_PATTERN.test(value)
      && !PLACEHOLDER_ONLY_VALUE_PATTERN.test(value);
  });
}

export function hasCompletedPrivacyOperationalDetails(body: string): boolean {
  return hasCompletedLabeledValues(body, PRIVACY_OPERATIONAL_LABELS);
}

export function hasCompletedTermsOperationalDetails(body: string): boolean {
  return hasCompletedLabeledValues(body, TERMS_OPERATIONAL_LABELS);
}

export function isStoreReadyPrivacyPolicy(
  document: { document_type: string; body: string } | null
): boolean {
  return Boolean(
    document
      && document.document_type === "privacy_policy"
      && !hasUnresolvedLegalReview(document.body)
      && hasConfirmedServiceIdentity(document.body)
      && hasRequiredAppPrivacyDisclosures(document.body)
      && hasCompletedPrivacyOperationalDetails(document.body)
  );
}

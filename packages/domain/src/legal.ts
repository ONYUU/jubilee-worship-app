import { SITE } from "./constants";

export const LEGAL_REVIEW_MARKER = "[[오너 확인 필요]]";

const PRIVACY_OPERATIONAL_LABELS = [
  "비활성 정보 보유 기간:",
  "발송 기록 보유 기간:",
  "정기 삭제 주기:",
  "수탁자:",
  "이전 국가:",
  "이전 항목:",
  "이전 시점 및 방법:",
  "국외 처리 보유 기간:",
  "이전 거부 방법 및 효과:",
  "개인정보 처리자의 법적 성명 또는 명칭:",
  "개인정보 보호책임자 또는 고충처리 담당부서:",
  "전화번호 등 연락처:",
  "국외 처리 법적 근거(법률 검토 후 확정):",
  "지원 문의 보유·삭제 기준:",
  "지원 이메일 제공자의 법적 역할·처리 근거:",
  "지원 이메일 국외 처리 국가:",
  "알림의 만 14세 이상 제한 또는 법정대리인 동의 절차:",
  "실제 시행일:",
  "오너 최종 사실확인:",
  "법률 전문가 검토 상태:"
] as const;

const TERMS_OPERATIONAL_LABELS = [
  "준거법:",
  "관할:",
  "면책 범위:",
  "미성년자 이용 안내:"
] as const;

const REQUIRED_APP_PRIVACY_DISCLOSURES = [
  "설치 식별자",
  "푸시 토큰",
  "알림 선택",
  "종교적 관심",
  "별도 동의",
  "동의 버전",
  "동의 시각",
  "보유",
  "비활성화",
  "SUPABASE PTE. LTD.",
  "650 Industries, Inc.",
  "Apple·Google 처리",
  "대한민국 서울(ap-northeast-2)",
  "미국",
  "Supabase Data API",
  "분산 요청 제한",
  "하루 100회",
  "하루 500회",
  "25시간 5분",
  "재사용할 수 없도록",
  "지원 문의 보유·삭제 기준:",
  "Google Workspace",
  "지원 이메일 제공자의 법적 역할·처리 근거:",
  "만 14세"
] as const;

const EXPLICIT_PLACEHOLDER_VALUE_PATTERN =
  /\[\[|\]\]|미정|추후|(?:확인|검토|확정|입력|기입|작성)\s*(?:필요|예정|중|대기)/i;
const PLACEHOLDER_ONLY_VALUE_PATTERN =
  /^(?:(?:내용|최종)\s*)*(?:(?:확인|검토|확정|완료|입력|기입|작성)(?:됨|함)?\s*)+[:.!]?$/i;
const EMPTY_EQUIVALENT_VALUE_PATTERN = /^(?:N\/?A|해당\s*없음)[:.!]?$/i;

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
      && !EXPLICIT_PLACEHOLDER_VALUE_PATTERN.test(value)
      && !PLACEHOLDER_ONLY_VALUE_PATTERN.test(value)
      && !EMPTY_EQUIVALENT_VALUE_PATTERN.test(value);
  });
}

export function hasUnresolvedLegalReview(body: string): boolean {
  return body.includes(LEGAL_REVIEW_MARKER);
}

export function hasConfirmedServiceIdentity(body: string): boolean {
  return body.includes("쥬빌리 워십") && body.includes(SITE.contact_email);
}

export function hasRequiredAppPrivacyDisclosures(body: string): boolean {
  return REQUIRED_APP_PRIVACY_DISCLOSURES.every((term) => body.includes(term));
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

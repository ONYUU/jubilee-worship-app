import { SITE } from "./constants";

export const LEGAL_REVIEW_MARKER = "[[오너 확인 필요]]";

const PRIVACY_OPERATIONAL_LABELS = [
  "공개 콘텐츠·보안 로그의 실제 처리 항목과 보유기간:",
  "공개 콘텐츠·보안 로그 처리의 법적 근거:",
  "비활성 정보 보유 기간:",
  "발송 기록 보유 기간:",
  "정기 삭제 주기:",
  "기기 내 저장 자료의 삭제 방법과 운영체제 백업·재설치 설정:",
  "Supabase 수신자 연락처:",
  "Expo 수신자 연락처:",
  "Apple·Google 수신자 연락처 또는 정책 확인 경로:",
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
  "권리행사 접수·본인 또는 정당한 대리인 확인·처리·회신 방법:",
  "지원 문의 처리의 법적 근거:",
  "지원 이메일 공급자 및 확정 주소:",
  "지원 문의 보유·삭제 기준:",
  "지원 문의 보유·삭제 운영 증빙:",
  "지원 이메일 공급자의 법적 역할·처리 근거:",
  "지원 이메일 공급자의 처리 국가:",
  "알림의 만 14세 이상 제한 또는 법정대리인 동의 절차:",
  "실제 시행일:",
  "오너 최종 사실확인:",
  "법률 전문가 검토 상태:"
] as const;

const TERMS_OPERATIONAL_LABELS = [
  "서비스 제공자의 법적 성명 또는 명칭:",
  "주소 및 전화번호:",
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
  "이름·이메일",
  "광고 식별자",
  "결합하지 않고",
  "알림 제공",
  "에만 사용",
  "광고·추적·이용자 프로파일링에 사용하지 않습니다",
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
  "「개인정보 보호법」 제15조제1항제1호",
  "제23조제1항제1호(민감정보 별도 동의)",
  "최대 50건·90일",
  "서버로 다시 전송하지 않습니다",
  "자동화된 결정",
  "광고 SDK",
  "지원 이메일 공급자 및 확정 주소:",
  "지원 문의 보유·삭제 기준:",
  "지원 문의 보유·삭제 운영 증빙:",
  "지원 이메일 공급자의 법적 역할·처리 근거:",
  "만 14세"
] as const;

const DISALLOWED_PRIVACY_CLAIMS = [
  "계약·서비스 운영주체는 싱가포르 법인 SUPABASE PTE. LTD.",
  "Gmail 기반 후보·임시 문의 주소",
  "최종 지원 이메일 공급자와 주소로 확정되지 않았습니다",
  "확인하기 전에는 이 정책을 공개하지 않습니다",
  "공급자별 법적 역할, 계약 당사자, 재위탁 구조, 국외 이전 근거는 실제 계정에 적용되는 최신 계약과 설정을 기준으로 확정합니다",
  "실제 계정에 적용되는 최신 계약·위탁 구조를 공개 전에 확정합니다",
  "이 연령 확인 방식의 법률적 충분성과 스토어 연령 설정의 정합성은 공개 전에 법률 전문가가 최종 검토합니다",
  "검토가 끝나기 전에는 개인정보처리방침을 공개하거나 알림 등록을 활성화하지 않습니다"
] as const;

const EXPLICIT_PLACEHOLDER_VALUE_PATTERN =
  /\[\[|\]\]|미정|추후|(?:확인|검토|확정|입력|기입|작성)\s*(?:필요|예정|중|대기)/i;
const PLACEHOLDER_ONLY_VALUE_PATTERN =
  /^(?:(?:내용|최종)\s*)*(?:(?:확인|검토|확정|완료|입력|기입|작성)(?:됨|함)?\s*)+[:.!]?$/i;
const EMPTY_EQUIVALENT_VALUE_PATTERN = /^(?:N\/?A|해당\s*없음)[:.!]?$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const CONTACT_CHANNEL_PATTERN = /(?:https:\/\/[^\s]+|[^\s@]+@[^\s@]+\.[^\s@]+)/i;
const PHONE_PATTERN = /[+]?\d{1,3}[-.\s]?0?\d{1,3}[-.\s]?\d{3,4}[-.\s]?\d{4}/;
const ADDRESS_HINT_PATTERN = /(?:특별자치도|특별자치시|광역시|특별시|[가-힣]+(?:도|시|군|구|읍|면|동|로|길))|\b(?:street|st\.?|road|rd\.?|avenue|ave\.?|boulevard|blvd\.?|lane|ln\.?|drive|dr\.?)\b/i;
const LEGAL_IDENTITY_PLACEHOLDER_PATTERN = /(?:담당자|서면|승인|검토|확인|기록|의견서|완료)/i;

const PRIVACY_CONTACT_EMAIL_LABEL = "개인정보 및 앱 이용 문의:";
const PRIVACY_LEGAL_IDENTITY_LABEL = "개인정보 처리자의 법적 성명 또는 명칭:";
const PRIVACY_PHONE_LABEL = "전화번호 등 연락처:";
const SUPPORT_PROVIDER_ADDRESS_LABEL = "지원 이메일 공급자 및 확정 주소:";
const PRIVACY_RECIPIENT_CONTACT_LABELS = [
  "Supabase 수신자 연락처:",
  "Expo 수신자 연락처:",
  "Apple·Google 수신자 연락처 또는 정책 확인 경로:"
] as const;
const TERMS_LEGAL_IDENTITY_LABEL = "서비스 제공자의 법적 성명 또는 명칭:";
const TERMS_ADDRESS_AND_PHONE_LABEL = "주소 및 전화번호:";
const TERMS_CONTACT_EMAIL_LABEL = "서비스 문의:";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getSingleLabeledValue(body: string, label: string): string | null {
  const lines = body.replaceAll("\r\n", "\n").split("\n");
  const matcher = new RegExp(`^\\s*(?:[-*]\\s+)?${escapeRegExp(label)}\\s*(.*)$`);
  const matches = lines.map((line) => line.match(matcher)).filter((match) => match !== null);
  if (matches.length !== 1) return null;
  return matches[0]?.[1]?.trim() ?? null;
}

function hasCompletedLabeledValues(body: string, labels: readonly string[]): boolean {
  return labels.every((label) => {
    const value = getSingleLabeledValue(body, label) ?? "";
    return value.length >= 2
      && /[0-9A-Za-z가-힣]/.test(value)
      && !EXPLICIT_PLACEHOLDER_VALUE_PATTERN.test(value)
      && !PLACEHOLDER_ONLY_VALUE_PATTERN.test(value)
      && !EMPTY_EQUIVALENT_VALUE_PATTERN.test(value);
  });
}

function hasPlausibleLegalIdentity(body: string, label: string): boolean {
  const value = getSingleLabeledValue(body, label) ?? "";
  return value.length >= 2
    && /[A-Za-z가-힣]/.test(value)
    && !value.includes("@")
    && !value.toLowerCase().includes("https://")
    && !PHONE_PATTERN.test(value)
    && !LEGAL_IDENTITY_PLACEHOLDER_PATTERN.test(value);
}

function hasValidPrivacyContactDetails(body: string): boolean {
  const contactEmail = getSingleLabeledValue(body, PRIVACY_CONTACT_EMAIL_LABEL) ?? "";
  const supportProviderAddress = getSingleLabeledValue(body, SUPPORT_PROVIDER_ADDRESS_LABEL) ?? "";
  const phone = getSingleLabeledValue(body, PRIVACY_PHONE_LABEL) ?? "";

  return EMAIL_PATTERN.test(contactEmail)
    && contactEmail === SITE.contact_email
    && supportProviderAddress.includes(contactEmail)
    && PHONE_PATTERN.test(phone)
    && hasPlausibleLegalIdentity(body, PRIVACY_LEGAL_IDENTITY_LABEL)
    && PRIVACY_RECIPIENT_CONTACT_LABELS.every((label) =>
      CONTACT_CHANNEL_PATTERN.test(getSingleLabeledValue(body, label) ?? "")
    );
}

function hasValidTermsProviderDetails(body: string): boolean {
  const addressAndPhone = getSingleLabeledValue(body, TERMS_ADDRESS_AND_PHONE_LABEL) ?? "";
  const contactEmail = getSingleLabeledValue(body, TERMS_CONTACT_EMAIL_LABEL) ?? "";
  return hasPlausibleLegalIdentity(body, TERMS_LEGAL_IDENTITY_LABEL)
    && PHONE_PATTERN.test(addressAndPhone)
    && ADDRESS_HINT_PATTERN.test(addressAndPhone)
    && EMAIL_PATTERN.test(contactEmail)
    && contactEmail === SITE.contact_email;
}

export function hasUnresolvedLegalReview(body: string): boolean {
  return body.includes(LEGAL_REVIEW_MARKER);
}

export function hasConfirmedServiceIdentity(body: string): boolean {
  return body.includes("쥬빌리 워십");
}

export function hasRequiredAppPrivacyDisclosures(body: string): boolean {
  return REQUIRED_APP_PRIVACY_DISCLOSURES.every((term) => body.includes(term))
    && DISALLOWED_PRIVACY_CLAIMS.every((claim) => !body.includes(claim));
}

export function hasCompletedPrivacyOperationalDetails(body: string): boolean {
  return hasCompletedLabeledValues(body, PRIVACY_OPERATIONAL_LABELS)
    && hasValidPrivacyContactDetails(body);
}

export function hasCompletedTermsOperationalDetails(body: string): boolean {
  return hasCompletedLabeledValues(body, TERMS_OPERATIONAL_LABELS)
    && hasValidTermsProviderDetails(body);
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

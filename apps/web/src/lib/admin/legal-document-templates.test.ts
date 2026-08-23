import { describe, expect, it } from "vitest";
import {
  getLegalDocumentTemplate,
  hasCompletedPrivacyOperationalDetails,
  hasCompletedTermsOperationalDetails,
  hasConfirmedServiceIdentity,
  hasRequiredAppPrivacyDisclosures,
  hasUnresolvedLegalReview,
  isStoreReadyPrivacyPolicy,
  LEGAL_REVIEW_MARKER
} from "./legal-document-templates";

const SUPPORT_CHANNEL_TRANSITION_NOTICE =
  "현재 표시된 sundoojubileeworship@gmail.com은 Gmail 기반 후보·임시 문의 주소이며 스토어 제출용 최종 지원 이메일 공급자와 주소로 확정되지 않았습니다. 실제 공급자·주소, 적용 계약, 관리자 보안·접근권한·삭제 설정, 처리 국가와 삭제 운영 증빙을 확인하기 전에는 이 정책을 공개하지 않습니다.";
const FINAL_SUPPORT_CHANNEL_NOTICE =
  "아래 운영 항목에 기재된 지원 이메일 공급자·주소, 적용 계약, 관리자 보안·접근권한·삭제 설정, 처리 국가와 삭제 운영 증빙은 2026-09-01 시험 승인 기록으로 확인했습니다.";
const SUPPLIER_REVIEW_NOTICE =
  "공급자별 법적 역할, 계약 당사자, 재위탁 구조, 국외 이전 근거는 실제 계정에 적용되는 최신 계약과 설정을 기준으로 확정합니다.";
const SUPABASE_REVIEW_NOTICE =
  "실제 계정에 적용되는 최신 계약·위탁 구조를 공개 전에 확정합니다.";
const AGE_REVIEW_NOTICE =
  "이 연령 확인 방식의 법률적 충분성과 스토어 연령 설정의 정합성은 공개 전에 법률 전문가가 최종 검토합니다. 검토가 끝나기 전에는 개인정보처리방침을 공개하거나 알림 등록을 활성화하지 않습니다.";

function reviewedPrivacyBody(): string {
  return getLegalDocumentTemplate("privacy_policy").body
    .replace(SUPPORT_CHANNEL_TRANSITION_NOTICE, FINAL_SUPPORT_CHANNEL_NOTICE)
    .replace(
      SUPPLIER_REVIEW_NOTICE,
      "공급자별 법적 역할·계약 당사자·재위탁 구조·국외 이전 근거는 2026-09-01 시험 검토 기록으로 확인했습니다."
    )
    .replace(
      SUPABASE_REVIEW_NOTICE,
      "실제 계정의 최신 계약·위탁 구조는 2026-09-01 시험 검토 기록으로 확인했습니다."
    )
    .replace(
      AGE_REVIEW_NOTICE,
      "연령 확인 방식과 스토어 연령 설정의 정합성은 2026-09-01 시험 법률 검토 의견으로 확인했습니다."
    )
    .replace(
      `개인정보 처리자의 법적 성명 또는 명칭: ${LEGAL_REVIEW_MARKER}`,
      "개인정보 처리자의 법적 성명 또는 명칭: 주빌리 워십 운영위원회"
    )
    .replace(
      `전화번호 등 연락처: ${LEGAL_REVIEW_MARKER}`,
      "전화번호 등 연락처: 032-123-4567"
    )
    .replace(
      `Supabase 수신자 연락처: ${LEGAL_REVIEW_MARKER}`,
      "Supabase 수신자 연락처: https://supabase.com/privacy"
    )
    .replace(
      `Expo 수신자 연락처: ${LEGAL_REVIEW_MARKER}`,
      "Expo 수신자 연락처: https://expo.dev/privacy"
    )
    .replace(
      `Apple·Google 수신자 연락처 또는 정책 확인 경로: ${LEGAL_REVIEW_MARKER}`,
      "Apple·Google 수신자 연락처 또는 정책 확인 경로: https://www.apple.com/legal/privacy/"
    )
    .replace(
      `지원 이메일 공급자 및 확정 주소: ${LEGAL_REVIEW_MARKER}`,
      "지원 이메일 공급자 및 확정 주소: 시험메일(Test Mail) sundoojubileeworship@gmail.com"
    )
    .replaceAll(LEGAL_REVIEW_MARKER, "2026-09-01 담당자 서면 승인 기록");
}

describe("legal document templates", () => {
  it.each(["privacy_policy", "terms_of_service"] as const)(
    "keeps the confirmed operator and contact in %s",
    (documentType) => {
      const template = getLegalDocumentTemplate(documentType);
      expect(template.body).toContain("운영주체는 쥬빌리 워십");
      expect(template.body).toContain("sundoojubileeworship@gmail.com");
      expect(hasConfirmedServiceIdentity(template.body)).toBe(true);
      if (documentType === "privacy_policy") {
        expect(hasRequiredAppPrivacyDisclosures(template.body)).toBe(false);
        expect(template.body).toContain("최대 24시간 이내에 데이터베이스 토큰 원문과 해시를 삭제");
        expect(template.body).toContain("180일 동안 활동이 확인되지 않은 설치");
        expect(template.body).toContain(
          "비활성화 후 30일이 경과한 항목을 다음 정기 삭제 작업에서 삭제"
        );
        expect(template.body).toContain(
          "발송 상세기록은 90일이 경과한 항목을 다음 정기 삭제 작업에서 삭제"
        );
        expect(template.body).toContain(
          "작업 지연·적체 시 실제 삭제는 다음 정상 실행 이후 완료될 수 있음"
        );
        expect(template.body).toContain("정기 삭제 주기: 매일 오전 3시 17분(한국시간) 1회");
        expect(template.body).toContain("종교적 관심");
        expect(template.body).toContain("광고·추적·이용자 프로파일링에 사용하지 않습니다");
        expect(template.body).toContain("운영체제 기기 푸시 토큰(APNs 또는 FCM)");
        expect(template.body).toContain("Expo 앱 설치 식별자");
        expect(template.body).toContain("실제 알림 발송 때는 Expo 푸시 토큰");
        expect(template.body).toContain("Apple·Google 처리:");
        expect(template.body).toContain("「개인정보 보호법」 제15조제1항제1호");
        expect(template.body).toContain("제23조제1항제1호(민감정보 별도 동의)");
        expect(template.body).toContain("수신한 알림의 식별값, 제목·본문, 수신 시각");
        expect(template.body).toContain("최대 50건·90일");
        expect(template.body).toContain("이 내역을 서버로 다시 전송하지 않습니다");
        expect(template.body).toContain("제3자 제공, 자동화된 결정, 광고·행태정보");
        expect(template.body).toContain("권익침해 구제방법");
        expect(template.body).toContain("지원 이메일 공급자 및 확정 주소:");
        expect(template.body).toContain("지원 문의 보유·삭제 운영 증빙:");
        expect(template.body).toContain("Gmail 기반 후보·임시 문의 주소");
        expect(template.body).not.toContain("Google Workspace");
        expect(template.body).not.toContain("업무용 계정으로 전환하기로 결정");
        expect(template.body).not.toContain(
          "계약·서비스 운영주체는 싱가포르 법인 SUPABASE PTE. LTD."
        );
        expect(hasRequiredAppPrivacyDisclosures(
          `${template.body}\n계약·서비스 운영주체는 싱가포르 법인 SUPABASE PTE. LTD.`
        )).toBe(false);
      } else {
        expect(template.body).toContain("회원가입·로그인·결제·이용자 게시물 기능 없이");
        expect(template.body).toContain("서비스 제공자의 법적 성명 또는 명칭:");
      }
      expect(hasUnresolvedLegalReview(template.body)).toBe(true);
    }
  );

  it("does not block a fully reviewed body after the explicit markers are removed", () => {
    const reviewed = getLegalDocumentTemplate("terms_of_service").body.replaceAll(
      LEGAL_REVIEW_MARKER,
      "최종 검토 완료:"
    );
    expect(hasUnresolvedLegalReview(reviewed)).toBe(false);
  });

  it("does not accept privacy placeholders that were only renamed as final", () => {
    const renamedPlaceholders = getLegalDocumentTemplate("privacy_policy").body.replaceAll(
      LEGAL_REVIEW_MARKER,
      "최종 확정:"
    );
    expect(hasUnresolvedLegalReview(renamedPlaceholders)).toBe(false);
    expect(hasCompletedPrivacyOperationalDetails(renamedPlaceholders)).toBe(false);
    expect(isStoreReadyPrivacyPolicy({
      document_type: "privacy_policy",
      body: renamedPlaceholders
    })).toBe(false);

    const completedOnly = getLegalDocumentTemplate("privacy_policy").body.replaceAll(
      LEGAL_REVIEW_MARKER,
      "완료"
    );
    expect(hasCompletedPrivacyOperationalDetails(completedOnly)).toBe(false);
    expect(isStoreReadyPrivacyPolicy({ document_type: "privacy_policy", body: completedOnly })).toBe(false);

    for (const placeholder of [
      "검토 완료함",
      "내용 확인 완료함",
      "확정 완료함",
      "기입완료",
      "확인 필요",
      "검토 예정"
    ]) {
      const renamed = getLegalDocumentTemplate("privacy_policy").body.replaceAll(
        LEGAL_REVIEW_MARKER,
        placeholder
      );
      expect(hasCompletedPrivacyOperationalDetails(renamed)).toBe(false);
      expect(isStoreReadyPrivacyPolicy({ document_type: "privacy_policy", body: renamed })).toBe(false);
    }
  });

  it("requires a published privacy body to contain confirmed identity and completed operational values", () => {
    const blanketApproval = getLegalDocumentTemplate("privacy_policy").body
      .replace(SUPPORT_CHANNEL_TRANSITION_NOTICE, FINAL_SUPPORT_CHANNEL_NOTICE)
      .replaceAll(LEGAL_REVIEW_MARKER, "2026-09-01 담당자 서면 승인 기록");
    expect(hasUnresolvedLegalReview(blanketApproval)).toBe(false);
    expect(hasRequiredAppPrivacyDisclosures(blanketApproval)).toBe(false);
    expect(hasCompletedPrivacyOperationalDetails(blanketApproval)).toBe(false);
    expect(isStoreReadyPrivacyPolicy({
      document_type: "privacy_policy",
      body: blanketApproval
    })).toBe(false);

    const body = reviewedPrivacyBody();
    expect(body).toContain("‘만 14세 이상입니다’ 확인과 민감정보 별도 동의");
    expect(body).not.toContain(SUPPORT_CHANNEL_TRANSITION_NOTICE);
    expect(hasRequiredAppPrivacyDisclosures(body)).toBe(true);
    expect(hasCompletedPrivacyOperationalDetails(body)).toBe(true);
    expect(isStoreReadyPrivacyPolicy({ document_type: "privacy_policy", body })).toBe(true);
    for (const criticalDisclosure of [
      "운영체제 기기 푸시 토큰(APNs 또는 FCM)",
      "Expo 앱 설치 식별자",
      "Expo 푸시 토큰을 발급·갱신",
      "실제 알림 발송 때",
      "알림 제목·본문·딥링크",
      "티켓·영수증·오류",
      "Apple 또는 Google은 운영체제 기기 푸시 토큰",
      "대상 종류·관련 예배 일정",
      "발송 승인·대기 상태",
      "설치별 발송 시도",
      "Expo의 운영체제 토큰 자동 갱신을 끄고",
      "APNs 또는 FCM 기기 토큰 등록 해제",
      "보안저장소에 정리 대기 상태"
    ]) {
      const incompleteBody = body.replaceAll(criticalDisclosure, "누락된 처리 항목");
      expect(hasRequiredAppPrivacyDisclosures(incompleteBody)).toBe(false);
      expect(isStoreReadyPrivacyPolicy({
        document_type: "privacy_policy",
        body: incompleteBody
      })).toBe(false);
    }
    for (const unresolvedTransitionClaim of [
      "Gmail 기반 후보·임시 문의 주소",
      "최종 지원 이메일 공급자와 주소로 확정되지 않았습니다",
      "확인하기 전에는 이 정책을 공개하지 않습니다",
      SUPPLIER_REVIEW_NOTICE,
      SUPABASE_REVIEW_NOTICE,
      "이 연령 확인 방식의 법률적 충분성과 스토어 연령 설정의 정합성은 공개 전에 법률 전문가가 최종 검토합니다",
      "검토가 끝나기 전에는 개인정보처리방침을 공개하거나 알림 등록을 활성화하지 않습니다"
    ]) {
      const unresolvedBody = `${body}\n${unresolvedTransitionClaim}`;
      expect(hasRequiredAppPrivacyDisclosures(unresolvedBody)).toBe(false);
      expect(isStoreReadyPrivacyPolicy({
        document_type: "privacy_policy",
        body: unresolvedBody
      })).toBe(false);
    }
    expect(isStoreReadyPrivacyPolicy({
      document_type: "privacy_policy",
      body: body.replaceAll(
        "sundoojubileeworship@gmail.com",
        "temporary-contact@example.invalid"
      )
    })).toBe(false);
    expect(isStoreReadyPrivacyPolicy({
      document_type: "privacy_policy",
      body: body.replaceAll(
        "sundoojubileeworship@gmail.com",
        "SUNDOOJUBILEEWORSHIP@GMAIL.COM"
      )
    })).toBe(false);
    expect(isStoreReadyPrivacyPolicy({
      document_type: "privacy_policy",
      body: body.replaceAll("쥬빌리 워십", "")
    })).toBe(false);
    expect(isStoreReadyPrivacyPolicy({
      document_type: "privacy_policy",
      body: body.replaceAll("푸시 토큰", "기기 정보")
    })).toBe(false);
    expect(isStoreReadyPrivacyPolicy({
      document_type: "privacy_policy",
      body: body.replaceAll("최대 50건·90일", "일정 기간")
    })).toBe(false);
    expect(isStoreReadyPrivacyPolicy({
      document_type: "privacy_policy",
      body: body.replace(
        "지원 이메일 공급자 및 확정 주소: 시험메일(Test Mail) sundoojubileeworship@gmail.com",
        "지원 이메일 공급자 및 확정 주소: 최종 검토:"
      )
    })).toBe(false);
    expect(isStoreReadyPrivacyPolicy({
      document_type: "privacy_policy",
      body: body.replace(
        "지원 문의 보유·삭제 운영 증빙: 2026-09-01 담당자 서면 승인 기록",
        "지원 문의 보유·삭제 운영 증빙: 확인 필요"
      )
    })).toBe(false);
    expect(isStoreReadyPrivacyPolicy({
      document_type: "privacy_policy",
      body: `${body}\n정기 삭제 주기: 미정`
    })).toBe(false);
    expect(hasCompletedPrivacyOperationalDetails(body.replace(
      "개인정보 및 앱 이용 문의: sundoojubileeworship@gmail.com",
      "개인정보 및 앱 이용 문의: other@example.invalid"
    ))).toBe(false);
    expect(hasCompletedPrivacyOperationalDetails(body.replace(
      "전화번호 등 연락처: 032-123-4567",
      "전화번호 등 연락처: 담당부서 서면 승인"
    ))).toBe(false);
    expect(hasCompletedPrivacyOperationalDetails(body.replace(
      "Supabase 수신자 연락처: https://supabase.com/privacy",
      "Supabase 수신자 연락처: 공식 지원 포털"
    ))).toBe(false);
    expect(hasCompletedPrivacyOperationalDetails(body.replace(
      "개인정보 처리자의 법적 성명 또는 명칭: 주빌리 워십 운영위원회",
      "개인정보 처리자의 법적 성명 또는 명칭: 2026-09-01 담당자 서면 승인 기록"
    ))).toBe(false);
    expect(hasCompletedPrivacyOperationalDetails(body.replace(
      "개인정보 처리자의 법적 성명 또는 명칭: 주빌리 워십 운영위원회",
      "개인정보 처리자의 법적 성명 또는 명칭: 주빌리 담당 org@example.com"
    ))).toBe(false);
    expect(hasCompletedPrivacyOperationalDetails(body.replace(
      "개인정보 처리자의 법적 성명 또는 명칭: 주빌리 워십 운영위원회",
      "개인정보 처리자의 법적 성명 또는 명칭: HTTPS://example.com 운영자"
    ))).toBe(false);
    for (const emptyEquivalent of ["N/A:", "NA.", "해당   없음."]) {
      expect(hasCompletedPrivacyOperationalDetails(body.replace(
        "비활성 정보 보유 기간: 비활성화 후 30일이 경과한 항목을 다음 정기 삭제 작업에서 삭제",
        `비활성 정보 보유 기간: ${emptyEquivalent}`
      ))).toBe(false);
    }
    expect(hasCompletedPrivacyOperationalDetails(body.replace(
      "Supabase 수신자 연락처: https://supabase.com/privacy",
      "- Supabase 수신자 연락처: https://supabase.com/privacy"
    ))).toBe(true);
    expect(hasCompletedPrivacyOperationalDetails(body.replace(
      "Supabase 수신자 연락처: https://supabase.com/privacy",
      "-Supabase 수신자 연락처: https://supabase.com/privacy"
    ))).toBe(false);
    expect(isStoreReadyPrivacyPolicy(null)).toBe(false);
  });

  it("requires actual terms values and rejects a simple marker rename", () => {
    const renamedPlaceholders = getLegalDocumentTemplate("terms_of_service").body.replaceAll(
      LEGAL_REVIEW_MARKER,
      "최종 검토:"
    );
    expect(hasCompletedTermsOperationalDetails(renamedPlaceholders)).toBe(false);

    const completed = getLegalDocumentTemplate("terms_of_service").body
      .replace(
        `서비스 제공자의 법적 성명 또는 명칭: ${LEGAL_REVIEW_MARKER}`,
        "서비스 제공자의 법적 성명 또는 명칭: 주빌리 워십 운영위원회"
      )
      .replace(
        `주소 및 전화번호: ${LEGAL_REVIEW_MARKER}`,
        "주소 및 전화번호: 대한민국 인천광역시 부평구 예시로 123, 032-123-4567"
      )
      .replace(`준거법: ${LEGAL_REVIEW_MARKER}`, "준거법: 대한민국 법령")
      .replace(`관할: ${LEGAL_REVIEW_MARKER}`, "관할: 민사소송법상 관할 법원")
      .replace(
        `면책 범위: ${LEGAL_REVIEW_MARKER}`,
        "면책 범위: 관련 법령이 허용하는 범위에서만 적용"
      )
      .replace(
        `미성년자 이용 안내: ${LEGAL_REVIEW_MARKER}`,
        "미성년자 이용 안내: 공개 콘텐츠는 이용 가능하고 알림은 만 14세 이상만 이용"
      );
    expect(hasUnresolvedLegalReview(completed)).toBe(false);
    expect(hasCompletedTermsOperationalDetails(completed)).toBe(true);
    expect(hasCompletedTermsOperationalDetails(completed.replace(
      "서비스 문의: sundoojubileeworship@gmail.com",
      "서비스 문의: other@example.invalid"
    ))).toBe(false);
    expect(hasCompletedTermsOperationalDetails(completed.replace(
      "대한민국 인천광역시 부평구 예시로 123, 032-123-4567",
      "2026-09-01 주소·전화 서면 승인 기록"
    ))).toBe(false);
  });

  it("rejects terms when only the provider identity fields are disguised placeholders", () => {
    const disguisedIdentity = getLegalDocumentTemplate("terms_of_service").body
      .replace(
        `서비스 제공자의 법적 성명 또는 명칭: ${LEGAL_REVIEW_MARKER}`,
        "서비스 제공자의 법적 성명 또는 명칭: 최종 검토:"
      )
      .replace(
        `주소 및 전화번호: ${LEGAL_REVIEW_MARKER}`,
        "주소 및 전화번호: 최종 검토:"
      )
      .replace(`준거법: ${LEGAL_REVIEW_MARKER}`, "준거법: 대한민국 법령")
      .replace(`관할: ${LEGAL_REVIEW_MARKER}`, "관할: 민사소송법상 관할 법원")
      .replace(
        `면책 범위: ${LEGAL_REVIEW_MARKER}`,
        "면책 범위: 관련 법령이 허용하는 범위에서만 적용"
      )
      .replace(
        `미성년자 이용 안내: ${LEGAL_REVIEW_MARKER}`,
        "미성년자 이용 안내: 공개 콘텐츠는 이용 가능하고 알림은 만 14세 이상만 이용"
      );

    expect(hasUnresolvedLegalReview(disguisedIdentity)).toBe(false);
    expect(hasCompletedTermsOperationalDetails(disguisedIdentity)).toBe(false);
  });
});

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

describe("legal document templates", () => {
  it.each(["privacy_policy", "terms_of_service"] as const)(
    "keeps the confirmed operator and contact in %s",
    (documentType) => {
      const template = getLegalDocumentTemplate(documentType);
      expect(template.body).toContain("운영주체는 쥬빌리 워십");
      expect(template.body).toContain("sundoojubileeworship@gmail.com");
      expect(hasConfirmedServiceIdentity(template.body)).toBe(true);
      if (documentType === "privacy_policy") {
        expect(hasRequiredAppPrivacyDisclosures(template.body)).toBe(true);
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

    for (const placeholder of ["검토 완료함", "내용 확인 완료함", "확정 완료함", "기입완료"]) {
      const renamed = getLegalDocumentTemplate("privacy_policy").body.replaceAll(
        LEGAL_REVIEW_MARKER,
        placeholder
      );
      expect(hasCompletedPrivacyOperationalDetails(renamed)).toBe(false);
      expect(isStoreReadyPrivacyPolicy({ document_type: "privacy_policy", body: renamed })).toBe(false);
    }
  });

  it("requires a published privacy body to contain confirmed identity and completed operational values", () => {
    let body = getLegalDocumentTemplate("privacy_policy").body;
    const completedValues = [
      "알림 해제 후 30일",
      "발송일로부터 90일",
      "매일 1회",
      "Supabase, Inc. 및 650 Industries, Inc.",
      "미국",
      "설치 식별자, 푸시 토큰, 플랫폼, 앱 버전, 알림 선택 설정",
      "알림 기능 이용 시 암호화된 네트워크를 통한 전송",
      "이용 목적 달성 또는 계약 종료 시까지",
      "앱 알림 설정에서 거부할 수 있으며 거부 시 푸시 알림을 받을 수 없음"
    ];
    for (const value of completedValues) {
      body = body.replace(LEGAL_REVIEW_MARKER, value);
    }
    expect(hasCompletedPrivacyOperationalDetails(body)).toBe(true);
    expect(isStoreReadyPrivacyPolicy({ document_type: "privacy_policy", body })).toBe(true);
    expect(isStoreReadyPrivacyPolicy({
      document_type: "privacy_policy",
      body: body.replace("sundoojubileeworship@gmail.com", "")
    })).toBe(false);
    expect(isStoreReadyPrivacyPolicy({
      document_type: "privacy_policy",
      body: body.replaceAll("푸시 토큰", "기기 정보")
    })).toBe(false);
    expect(isStoreReadyPrivacyPolicy({
      document_type: "privacy_policy",
      body: `${body}\n정기 삭제 주기: 미정`
    })).toBe(false);
    expect(isStoreReadyPrivacyPolicy(null)).toBe(false);
  });

  it("requires actual terms values and rejects a simple marker rename", () => {
    const renamedPlaceholders = getLegalDocumentTemplate("terms_of_service").body.replaceAll(
      LEGAL_REVIEW_MARKER,
      "최종 검토:"
    );
    expect(hasCompletedTermsOperationalDetails(renamedPlaceholders)).toBe(false);

    let completed = getLegalDocumentTemplate("terms_of_service").body;
    for (const value of [
      "대한민국 법령",
      "민사소송법상 관할 법원",
      "관련 법령이 허용하는 범위에서 서비스 사용자의 고의나 과실에 따른 손해는 제외함",
      "미성년자도 이용할 수 있으며 법정대리인의 지도를 권장함"
    ]) {
      completed = completed.replace(LEGAL_REVIEW_MARKER, value);
    }
    expect(hasCompletedTermsOperationalDetails(completed)).toBe(true);
  });
});

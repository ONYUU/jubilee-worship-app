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
        expect(template.body).toContain("최대 24시간 이내에 데이터베이스 토큰 원문과 해시를 삭제");
        expect(template.body).toContain("180일 동안 활동이 확인되지 않은 설치");
        expect(template.body).toContain("비활성화 후 최대 30일");
        expect(template.body).toContain("발송 상세기록 최대 90일");
        expect(template.body).toContain("정기 삭제 주기: 매일 오전 3시 17분(한국시간) 1회");
        expect(template.body).toContain("종교적 관심");
        expect(template.body).toContain("광고·추적·이용자 프로파일링에 사용하지 않습니다");
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
    const body = getLegalDocumentTemplate("privacy_policy").body.replaceAll(
      LEGAL_REVIEW_MARKER,
      "2026-09-01 담당자 서면 승인 기록"
    );
    expect(body).toContain("‘만 14세 이상입니다’ 확인과 민감정보 별도 동의");
    expect(hasCompletedPrivacyOperationalDetails(body)).toBe(true);
    expect(isStoreReadyPrivacyPolicy({ document_type: "privacy_policy", body })).toBe(true);
    expect(isStoreReadyPrivacyPolicy({
      document_type: "privacy_policy",
      body: body.replaceAll("sundoojubileeworship@gmail.com", "")
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

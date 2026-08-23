import { describe, expect, it } from "vitest";
import { SITE } from "@jubilee/domain";
import { selectStoreReadyPrivacyPolicy } from "./legal";

const readyBody = `쥬빌리 워십 설치 식별자 푸시 토큰 알림 선택 종교적 관심 별도 동의 동의 버전 동의 시각 보유 비활성화 SUPABASE PTE. LTD. 650 Industries, Inc. Apple·Google 처리 대한민국 서울(ap-northeast-2) 미국 Supabase Data API 분산 요청 제한 하루 100회 하루 500회 25시간 5분 재사용할 수 없도록 만 14세 「개인정보 보호법」 제15조제1항제1호 제23조제1항제1호(민감정보 별도 동의) 최대 50건·90일 서버로 다시 전송하지 않습니다 자동화된 결정 광고 SDK
알림 제공에만 사용하며 이름·이메일·광고 식별자와 결합하지 않고 광고·추적·이용자 프로파일링에 사용하지 않습니다.
개인정보 및 앱 이용 문의: ${SITE.contact_email}
공개 콘텐츠·보안 로그의 실제 처리 항목과 보유기간: API 보안 로그 최대 30일
공개 콘텐츠·보안 로그 처리의 법적 근거: 2026-09-01 법률 의견서 제1항
비활성 정보 보유 기간: 30일
발송 기록 보유 기간: 90일
정기 삭제 주기: 매일
기기 내 저장 자료의 삭제 방법과 운영체제 백업·재설치 설정: 앱 데이터 삭제 및 앱 제거
Supabase 수신자 연락처: https://supabase.com/privacy
Expo 수신자 연락처: https://expo.dev/privacy
Apple·Google 수신자 연락처 또는 정책 확인 경로: https://www.apple.com/legal/privacy/
수탁자: 시험 사업자
이전 국가: 시험 국가
이전 항목: 알림 정보
이전 시점 및 방법: 동의 후 HTTPS
국외 처리 보유 기간: 30일
이전 거부 방법 및 효과: 알림 미사용
개인정보 처리자의 법적 성명 또는 명칭: 시험 운영자
개인정보 보호책임자 또는 고충처리 담당부서: 시험팀
전화번호 등 연락처: 032-000-0000
국외 처리 법적 근거(법률 검토 후 확정): 시험 근거
권리행사 접수·본인 또는 정당한 대리인 확인·처리·회신 방법: 지원 메일 접수 후 기기 증명값 확인
지원 문의 처리의 법적 근거: 2026-09-01 법률 의견서 제2항
지원 이메일 공급자 및 확정 주소: 시험 메일 공급자 ${SITE.contact_email}
지원 문의 보유·삭제 기준: 90일
지원 문의 보유·삭제 운영 증빙: 2026-09-01 관리자 설정 및 삭제 점검 기록
지원 이메일 공급자의 법적 역할·처리 근거: 독립 처리
지원 이메일 공급자의 처리 국가: 시험 국가
알림의 만 14세 이상 제한 또는 법정대리인 동의 절차: 법정대리인 절차
실제 시행일: 2026-09-01
오너 최종 사실확인: 2026-09-01 승인
법률 전문가 검토 상태: 2026-09-01 의견`;

function legal(body: string, version: string) {
  return {
    id: version === "1.0.0" ? 2 : 1,
    document_type: "privacy_policy" as const,
    version,
    title: "개인정보처리방침",
    body,
    effective_on: "2026-09-01",
    published_at: "2026-09-01T00:00:00Z"
  };
}

describe("selectStoreReadyPrivacyPolicy", () => {
  it("ignores a stale published draft and selects only a fully reviewed policy", () => {
    const selected = selectStoreReadyPrivacyPolicy([
      legal("이전 개인정보처리방침", "old"),
      legal(readyBody, "1.0.0")
    ]);

    expect(selected?.version).toBe("1.0.0");
  });

  it("returns null when no store-ready policy exists", () => {
    expect(selectStoreReadyPrivacyPolicy([legal("이전 문서", "old")])).toBeNull();
  });
});

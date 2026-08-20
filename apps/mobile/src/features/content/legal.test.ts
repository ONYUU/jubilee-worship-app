import { describe, expect, it } from "vitest";
import { selectStoreReadyPrivacyPolicy } from "./legal";

const readyBody = `쥬빌리 워십 sundoojubileeworship@gmail.com 설치 식별자 푸시 토큰 알림 선택 종교적 관심 별도 동의 동의 버전 동의 시각 보유 비활성화 SUPABASE PTE. LTD. 650 Industries, Inc. Apple·Google 처리 대한민국 서울(ap-northeast-2) 미국 Supabase Data API 분산 요청 제한 하루 100회 하루 500회 25시간 5분 재사용할 수 없도록 Google Workspace 만 14세
비활성 정보 보유 기간: 30일
발송 기록 보유 기간: 90일
정기 삭제 주기: 매일
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
지원 문의 보유·삭제 기준: 90일
지원 이메일 제공자의 법적 역할·처리 근거: 독립 처리
지원 이메일 국외 처리 국가: 시험 국가
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

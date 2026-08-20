import type { Metadata } from "next";
import { PageIntro } from "@/components/public/page-intro";
import { isStoreReadyPrivacyPolicy } from "@/lib/admin/legal-document-templates";
import { getPublicPrivacyPolicy } from "@/lib/data/repository";
import { contactMailto, SERVICE_IDENTITY } from "@/lib/site-identity";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: "쥬빌리워십 앱 및 홈페이지의 개인정보 처리 범위와 문의처를 안내합니다.",
  alternates: { canonical: "/privacy" },
  robots: { index: false, follow: true }
};

const sections = [
  {
    title: "운영주체와 문의",
    body: `홈페이지 운영주체는 ${SERVICE_IDENTITY.operatorName}입니다. 개인정보 및 서비스 문의는 ${SERVICE_IDENTITY.contactEmail}로 접수합니다.`
  },
  {
    title: "수집하는 정보",
    body: "현재 공개 홈페이지에는 방문자 회원가입, 문의 입력 폼, 결제 기능이 없습니다. 다만 고객지원의 이메일 링크를 선택해 외부 이메일 앱으로 문의하면 발신 이메일 주소·표시 이름, 사용자가 적은 문의 내용과 자발적으로 첨부한 기기·운영체제·앱 버전·발생 시각·스크린샷 등을 지원 메일 계정에서 처리할 수 있습니다."
  },
  {
    title: "접속 기록",
    body: "홈페이지는 Vercel에 호스팅됩니다. 안정적인 서비스 제공과 보안을 위해 Vercel이 IP 주소, 접속 시각, 브라우저·요청 정보 등 통상적인 접속 로그를 처리할 수 있습니다. 최종 공개 정책에는 실제 운영 플랜의 로그 보관 설정과 Vercel의 현행 정책을 다시 확인해 반영합니다."
  },
  {
    title: "이메일 지원 문의",
    body: `지원 문의는 Google Workspace 업무용 계정으로 전환하기로 결정했으며, 문의 해결일 또는 마지막 답변일로부터 90일 후 삭제하고 월 1회 삭제 대상을 점검합니다. 실제 업무용 주소·도메인과 계약·관리 설정은 아직 확인 전이므로 ${SERVICE_IDENTITY.contactEmail}은 전환 완료 전 임시 문의 주소입니다. 비밀번호, 인증번호, 설치 비밀값, 푸시 토큰 등 비밀정보를 보내면 안 되며, 삭제를 원하면 문의 주소로 대상 메일을 알려 요청할 수 있습니다.`
  },
  {
    title: "YouTube 영상",
    body: "영상은 처음부터 불러오지 않으며 방문자가 재생 버튼을 누른 경우에만 YouTube의 개인정보 보호 강화 도메인으로 연결됩니다. 재생 이후의 정보 처리는 YouTube의 정책을 따릅니다."
  },
  {
    title: "외부 링크",
    body: "인스타그램, YouTube, 네이버 지도, 카카오 지도와 선두교회 홈페이지 링크를 선택하면 해당 외부 서비스로 이동합니다. 외부 서비스에서의 정보 처리는 각 서비스의 정책을 따릅니다."
  },
  {
    title: "분석 도구와 기기 권한",
    body: "현재 마케팅 분석 도구를 사용하지 않으며 위치, 카메라, 마이크 권한을 요청하지 않습니다. 새로운 도구를 도입할 경우 실제 구성과 필요한 안내를 먼저 검토합니다."
  },
  {
    title: "안내 변경",
    body: "호스팅, 분석 도구 또는 홈페이지 기능이 변경되면 실제 처리 내용에 맞춰 이 안내를 수정합니다."
  }
];

export default async function PrivacyPage() {
  const publishedPolicy = await getPublicPrivacyPolicy().catch(() => null);
  const appPolicy = isStoreReadyPrivacyPolicy(publishedPolicy) ? publishedPolicy : null;

  return (
    <>
      <PageIntro
        eyebrow="PRIVACY"
        title="개인정보처리방침"
        description="앱 공개 정책과 홈페이지의 개인정보 처리 범위를 함께 안내합니다."
      />
      <section className="section-space bg-night-950">
        <div className="container-site max-w-4xl">
          <div className="rounded-[24px] border border-brand-sky/25 bg-brand-sky/5 p-6 md:p-8">
            <p className="font-display text-xs font-bold tracking-[0.16em] text-brand-sky">APP PRIVACY POLICY</p>
            {appPolicy ? (
              <article className="mt-4">
                <h2 className="font-serif text-3xl font-semibold">{appPolicy.title}</h2>
                <p className="mt-2 text-sm text-stone-400">버전 {appPolicy.version} · {appPolicy.effective_on} 시행</p>
                <p className="mt-7 whitespace-pre-wrap text-stone-300">{appPolicy.body}</p>
              </article>
            ) : (
              <div className="mt-4" role="status">
                <h2 className="font-serif text-3xl font-semibold">앱 개인정보처리방침 공개 전</h2>
                <p className="mt-3 text-stone-300">
                  오너가 확정 운영주체·문의처와 실제 알림 처리 내용을 검토한 최종 문서를 아직 공개하지 않았습니다. 이 상태에서는 이 URL을 스토어 개인정보 URL로 제출하면 안 됩니다.
                </p>
              </div>
            )}
          </div>

          <h2 className="mt-14 font-serif text-3xl font-semibold">홈페이지 개인정보 안내</h2>
          <p className="mt-3 text-sm text-stone-500">현황 확인: 2026-08-20 · 지원 문의 90일 삭제 기준 승인 · 업무용 주소와 최종 앱 정책은 공개 전 확인 필요</p>
          <div className="mt-10 divide-y divide-white/10 border-y border-white/10">
            {sections.map((section, index) => (
              <section key={section.title} className="grid gap-4 py-8 md:grid-cols-[80px_1fr] md:py-10">
                <span className="font-display text-sm text-brand-sky">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h2 className="font-serif text-2xl font-semibold">{section.title}</h2>
                  <p className="mt-4 text-stone-300">{section.body}</p>
                </div>
              </section>
            ))}
          </div>
          <p className="mt-10 rounded-[20px] border border-brand-sun/20 bg-brand-sun/5 p-6 text-sm text-stone-300">
            개인정보 처리자의 법적 명칭·담당자 연락처, Vercel과 Google Workspace의 실제 운영 설정·업무용 주소는 공식 공개 전에 확인해야 합니다. 현재 임시 문의: {" "}
            <a className="break-all underline underline-offset-2" href={contactMailto()}>
              {SERVICE_IDENTITY.contactEmail}
            </a>
          </p>
        </div>
      </section>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { BellRing, Home, Mail, ShieldCheck } from "lucide-react";
import { PageIntro } from "@/components/public/page-intro";
import {
  contactMailto,
  SERVICE_IDENTITY,
  WORSHIP_REMINDER_SCHEDULE
} from "@/lib/site-identity";

export const metadata: Metadata = {
  title: "고객지원",
  description:
    "쥬빌리워십 앱과 홈페이지의 이용 방법, 알림 문제 해결 절차 및 안전한 문의 방법을 안내합니다.",
  alternates: { canonical: "/support" }
};

const reportChecklist = [
  {
    label: "사용 환경",
    description: "iOS 또는 Android 중 사용 중인 플랫폼"
  },
  {
    label: "앱 버전",
    description: "앱의 안내 탭 아래쪽 ‘앱·문의’에서 확인한 버전"
  },
  {
    label: "기기 정보",
    description: "기기 모델과 운영체제 버전"
  },
  {
    label: "문제 내용",
    description: "어느 화면에서 무엇을 하던 중 어떤 현상이 발생했는지"
  },
  {
    label: "발생 시각",
    description: "문제가 발생한 날짜와 대략적인 시간"
  },
  {
    label: "화면 자료",
    description: "문제를 보여주는 스크린샷 또는 화면 녹화(비밀정보는 가린 뒤 첨부)"
  }
] as const;

const notificationSteps = [
  "앱 하단의 ‘안내’ 탭에서 ‘알림 설정’을 선택합니다.",
  "첫 알림을 켜면 만 14세 이상 확인과 예배·일정·송리스트 알림 선택에 대한 별도 안내가 나옵니다. 목적·처리 항목·보유기간을 읽고 두 확인을 모두 완료한 경우에만 기기 알림 권한을 요청합니다.",
  "화면 위쪽 상태가 ‘기기 알림 권한 허용됨’인지 확인하고, 받고 싶은 알림 항목을 켭니다.",
  "‘기기 알림 권한 꺼짐’으로 표시되면 ‘기기 설정 열기’를 눌러 휴대폰 설정에서 쥬빌리워십 알림을 허용합니다.",
  "휴대폰의 방해금지·집중 모드, 절전 모드 및 인터넷 연결 상태를 확인한 뒤 앱을 다시 엽니다.",
  "같은 문제가 계속되면 아래 문의 준비 항목을 적어 이메일로 보내 주세요."
] as const;

export default function SupportPage() {
  return (
    <>
      <PageIntro
        eyebrow="SUPPORT"
        title="쥬빌리워십 이용을 도와드립니다"
        description="앱과 홈페이지 이용 중 문제가 생기면 먼저 안내된 방법을 확인한 뒤 이메일로 문의해 주세요."
      />

      <section className="section-space bg-night-950">
        <div className="container-site max-w-5xl">
          <div className="grid gap-5 md:grid-cols-2">
            <a
              href="#notification-help"
              className="surface-card group flex min-h-36 items-center gap-5 p-6 transition hover:border-brand-sky/60 md:p-8"
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-sky/10 text-brand-sky">
                <BellRing size={22} aria-hidden="true" />
              </span>
              <span>
                <span className="font-serif text-2xl font-semibold">알림 문제 해결</span>
                <span className="mt-2 block text-sm text-stone-300">
                  앱과 휴대폰의 알림 권한을 순서대로 확인합니다.
                </span>
              </span>
            </a>
            <a
              href="#report-checklist"
              className="surface-card group flex min-h-36 items-center gap-5 p-6 transition hover:border-brand-sky/60 md:p-8"
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-sun/10 text-brand-sun">
                <Mail size={22} aria-hidden="true" />
              </span>
              <span>
                <span className="font-serif text-2xl font-semibold">문의 준비</span>
                <span className="mt-2 block text-sm text-stone-300">
                  확인에 필요한 기기 정보와 증상을 정리합니다.
                </span>
              </span>
            </a>
          </div>

          <section
            id="notification-help"
            aria-labelledby="notification-help-title"
            className="mt-20 scroll-mt-28"
          >
            <p className="eyebrow">NOTIFICATION HELP</p>
            <h2 id="notification-help-title" className="section-title mt-5">
              알림이 오지 않을 때
            </h2>
            <p className="mt-6 max-w-3xl text-stone-300">
              예배 알림은 {WORSHIP_REMINDER_SCHEDULE.dayBeforeLabel}과 {" "}
              {WORSHIP_REMINDER_SCHEDULE.oneHourBeforeLabel}에 설정되어 있습니다. 휴대폰 상태와
              일정 변경에 따라 실제 수신 여부를 확인해야 합니다.
            </p>

            <ol className="mt-10 divide-y divide-white/10 border-y border-white/10">
              {notificationSteps.map((step, index) => (
                <li key={step} className="grid gap-4 py-7 sm:grid-cols-[56px_1fr] sm:items-start">
                  <span className="font-display text-sm font-bold text-brand-sky">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p className="text-stone-300">{step}</p>
                </li>
              ))}
            </ol>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/worship" className="button-ghost">
                예배 일정 확인
              </Link>
              <a href="#contact" className="button-ghost">
                해결되지 않은 문제 문의
              </a>
            </div>
          </section>

          <section
            id="report-checklist"
            aria-labelledby="report-checklist-title"
            className="mt-24 scroll-mt-28"
          >
            <p className="eyebrow">BEFORE CONTACTING US</p>
            <h2 id="report-checklist-title" className="section-title mt-5">
              문의할 때 함께 알려 주세요
            </h2>
            <p className="mt-6 max-w-3xl text-stone-300">
              아래 내용을 포함하면 문제를 확인하는 데 도움이 됩니다. 문의 입력 폼은 운영하지
              않으며, 이메일 앱에서 직접 보내는 방식입니다.
            </p>

            <ul className="mt-10 grid gap-4 md:grid-cols-2">
              {reportChecklist.map((item, index) => (
                <li key={item.label} className="surface-card flex gap-5 p-6 md:p-7">
                  <span className="font-display text-sm font-bold text-brand-sun">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="font-serif text-xl font-semibold">{item.label}</h3>
                    <p className="mt-2 text-sm text-stone-300">{item.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section
            id="contact"
            aria-labelledby="contact-title"
            className="mt-24 scroll-mt-28 rounded-[24px] border border-brand-sky/25 bg-brand-sky/5 p-6 md:p-10"
          >
            <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
              <div className="max-w-2xl">
                <p className="eyebrow">EMAIL SUPPORT</p>
                <h2 id="contact-title" className="mt-5 font-serif text-3xl font-semibold md:text-4xl">
                  앱·홈페이지 문의
                </h2>
                <a
                  href={contactMailto()}
                  className="mt-5 inline-block break-all text-lg font-semibold text-brand-sky underline underline-offset-4"
                >
                  {SERVICE_IDENTITY.contactEmail}
                </a>
                <p className="mt-6 text-sm text-stone-300">
                  문의는 확인 가능한 순서대로 검토합니다. 문제 재현과 추가 확인이 필요한 정도,
                  문의량에 따라 답변 시점은 달라질 수 있으며 정해진 시간 내 답변을 보장하지
                  않습니다.
                </p>
              </div>
              <a href={contactMailto()} className="button-primary shrink-0">
                <Mail size={18} aria-hidden="true" />
                이메일 문의
              </a>
            </div>
          </section>

          <aside className="mt-8 rounded-[24px] border border-brand-sun/20 bg-brand-sun/5 p-6 md:p-8">
            <div className="flex gap-4">
              <ShieldCheck className="mt-1 shrink-0 text-brand-sun" size={24} aria-hidden="true" />
              <div>
                <h2 className="font-serif text-2xl font-semibold">비밀정보는 보내지 마세요</h2>
                <p className="mt-3 text-sm text-stone-300">
                  비밀번호, 인증번호, API 키·접속 토큰, 알림 시험용 연결 코드 등 다른 사람이
                  사용하면 안 되는 정보는 이메일이나 스크린샷에 포함하지 마세요. 화면 자료를
                  보내기 전에는 개인정보와 비밀정보를 가려 주세요.
                </p>
                <Link
                  href="/privacy"
                  className="mt-5 inline-block text-sm font-semibold text-brand-sky underline underline-offset-4"
                >
                  개인정보처리방침 보기
                </Link>
              </div>
            </div>
          </aside>

          <div className="mt-12">
            <Link href="/" className="button-ghost">
              <Home size={18} aria-hidden="true" />
              홈으로 돌아가기
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

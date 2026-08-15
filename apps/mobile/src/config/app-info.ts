import { SITE } from "@jubilee/domain";

export const APP_INFO = {
  appName: SITE.name_ko,
  operatorName: "쥬빌리 워십",
  contactEmail: SITE.contact_email
} as const;

export const WORSHIP_REMINDER_COPY = {
  title: "예배 알림",
  description: "예배 전날 오후 7시 30분과 당일 예배 1시간 전에 알려드립니다."
} as const;

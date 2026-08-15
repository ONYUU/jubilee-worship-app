import { SITE } from "@jubilee/domain";

export const SERVICE_IDENTITY = {
  operatorName: "쥬빌리 워십",
  contactEmail: SITE.contact_email
} as const;

export const WORSHIP_REMINDER_SCHEDULE = {
  dayBeforeLabel: "예배 전날 오후 7시 30분",
  dayBeforeLocalTime: "19:30",
  oneHourBeforeLabel: "예배 당일 1시간 전",
  oneHourBeforeOffsetMinutes: 60,
  dayBeforeTitle: "내일 쥬빌리워십 예배가 있습니다",
  dayBeforeBody: "내일 예배에서 만나요. 예배 시간과 장소를 앱에서 확인해 주세요.",
  oneHourBeforeTitle: "쥬빌리워십 예배 1시간 전입니다",
  oneHourBeforeBody: "곧 예배가 시작됩니다. 예배 시간과 장소를 앱에서 확인해 주세요."
} as const;

export function contactMailto(email = SERVICE_IDENTITY.contactEmail): string {
  return `mailto:${email}`;
}

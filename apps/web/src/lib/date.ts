const SEOUL_TIME_ZONE = "Asia/Seoul";

function dateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SEOUL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  return { year: value("year"), month: value("month"), day: value("day") };
}

export function getSeoulDday(iso: string, now = new Date()): string {
  const target = dateParts(new Date(iso));
  const current = dateParts(now);
  const targetUtc = Date.UTC(target.year, target.month - 1, target.day);
  const currentUtc = Date.UTC(current.year, current.month - 1, current.day);
  const days = Math.round((targetUtc - currentUtc) / 86_400_000);
  if (days === 0) return "TODAY";
  return days > 0 ? `D-${days}` : `D+${Math.abs(days)}`;
}

export function formatEventDate(iso: string) {
  const date = new Date(iso);
  return {
    full: new Intl.DateTimeFormat("ko-KR", {
      timeZone: SEOUL_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short"
    }).format(date),
    month: new Intl.DateTimeFormat("en-US", {
      timeZone: SEOUL_TIME_ZONE,
      month: "short"
    }).format(date),
    day: new Intl.DateTimeFormat("en-US", {
      timeZone: SEOUL_TIME_ZONE,
      day: "2-digit"
    }).format(date),
    weekday: new Intl.DateTimeFormat("en-US", {
      timeZone: SEOUL_TIME_ZONE,
      weekday: "short"
    })
      .format(date)
      .toUpperCase(),
    time: new Intl.DateTimeFormat("ko-KR", {
      timeZone: SEOUL_TIME_ZONE,
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    }).format(date)
  };
}

export function formatMediaDate(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: SEOUL_TIME_ZONE
  }).format(new Date(`${value}T12:00:00+09:00`));
}

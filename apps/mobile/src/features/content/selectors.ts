import {
  getSeoulDday,
  type MobilePublicContent,
  type MobilePublicEvent,
  type MobilePublicSetlist
} from "@jubilee/domain";

export function selectNextMobileEvent(
  events: readonly MobilePublicEvent[],
  now = new Date()
): MobilePublicEvent | null {
  return (
    events
      .filter(
        (event) =>
          (event.status === "scheduled" || event.status === "postponed") &&
          new Date(event.starts_at).getTime() >= now.getTime()
      )
      .sort((left, right) => Date.parse(left.starts_at) - Date.parse(right.starts_at))[0] ?? null
  );
}

export function selectSetlistForEvent(
  setlists: readonly MobilePublicSetlist[],
  eventId: number
): MobilePublicSetlist | null {
  return setlists.find((setlist) => setlist.event_id === eventId) ?? null;
}

export function selectHomeHeroMediaPath(
  site: Pick<MobilePublicContent["site"], "hero_media_path" | "hero_media_mobile_path">
): string | null {
  return site.hero_media_path ?? site.hero_media_mobile_path;
}

export function partitionMobileEvents(
  events: readonly MobilePublicEvent[],
  now = new Date()
): { upcoming: MobilePublicEvent[]; past: MobilePublicEvent[] } {
  const timestamp = now.getTime();
  return {
    upcoming: events.filter((event) => Date.parse(event.starts_at) >= timestamp),
    past: events.filter((event) => Date.parse(event.starts_at) < timestamp)
  };
}

export function formatEventDate(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }).format(new Date(value));
}

export function formatDday(value: string, now = new Date()): string {
  const days = getSeoulDday(value, now);
  if (days === 0) return "D-DAY";
  return days > 0 ? `D-${days}` : `D+${Math.abs(days)}`;
}

export function getLastUpdatedLabel(content: MobilePublicContent): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(content.fetched_at));
}

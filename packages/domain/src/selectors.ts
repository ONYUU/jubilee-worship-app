import type { Announcement, Event } from "./schemas";

type DateLike = Date | string | number;

function timestamp(value: DateLike): number {
  const result = value instanceof Date ? value.getTime() : new Date(value).getTime();
  if (Number.isNaN(result)) {
    throw new RangeError("Invalid date input");
  }
  return result;
}

/** Selects the earliest published, non-cancelled event that has not started. */
export function selectNextEvent(
  events: readonly Event[],
  now: DateLike = new Date()
): Event | null {
  const nowTimestamp = timestamp(now);

  return (
    events
      .filter(
        (event) =>
          event.published &&
          (event.status === "scheduled" || event.status === "postponed") &&
          timestamp(event.starts_at) >= nowTimestamp
      )
      .sort((left, right) => {
        const dateDifference =
          timestamp(left.starts_at) - timestamp(right.starts_at);
        if (dateDifference !== 0) {
          return dateDifference;
        }
        if (left.featured !== right.featured) {
          return left.featured ? -1 : 1;
        }
        return left.id - right.id;
      })[0] ?? null
  );
}

/**
 * Returns active public announcements without mutating the input. Start time
 * is inclusive and expiry time is exclusive.
 */
export function selectActiveAnnouncements(
  announcements: readonly Announcement[],
  now: DateLike = new Date()
): Announcement[] {
  const nowTimestamp = timestamp(now);

  return announcements
    .filter((announcement) => {
      if (!announcement.published) {
        return false;
      }
      if (
        announcement.starts_at !== null &&
        timestamp(announcement.starts_at) > nowTimestamp
      ) {
        return false;
      }
      return (
        announcement.expires_at === null ||
        timestamp(announcement.expires_at) > nowTimestamp
      );
    })
    .sort((left, right) => {
      if (left.pinned !== right.pinned) {
        return left.pinned ? -1 : 1;
      }

      const leftStartsAt =
        left.starts_at === null ? Number.NEGATIVE_INFINITY : timestamp(left.starts_at);
      const rightStartsAt =
        right.starts_at === null
          ? Number.NEGATIVE_INFINITY
          : timestamp(right.starts_at);
      if (leftStartsAt !== rightStartsAt) {
        return rightStartsAt - leftStartsAt;
      }

      const createdDifference =
        timestamp(right.created_at) - timestamp(left.created_at);
      return createdDifference !== 0 ? createdDifference : right.id - left.id;
    });
}

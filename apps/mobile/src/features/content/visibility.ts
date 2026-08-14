import type { MobilePublicContent } from "@jubilee/domain";

export function filterTimeSensitiveContent(
  content: MobilePublicContent,
  now = new Date()
): MobilePublicContent {
  const timestamp = now.getTime();
  return {
    ...content,
    announcements: content.announcements.filter((announcement) => {
      const startsAt = announcement.starts_at ? Date.parse(announcement.starts_at) : null;
      const expiresAt = announcement.expires_at ? Date.parse(announcement.expires_at) : null;
      return (startsAt === null || startsAt <= timestamp) && (expiresAt === null || expiresAt > timestamp);
    })
  };
}

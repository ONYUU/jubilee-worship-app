import {
  APPROVED_YOUTUBE_CHANNEL_IDS,
  APPROVED_YOUTUBE_VIDEO_IDS,
  YOUTUBE_VIDEO_HOSTS
} from "./constants";

const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOST_SET = new Set<string>(YOUTUBE_VIDEO_HOSTS);
const STANDARD_YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com"
]);
const SHORT_YOUTUBE_HOSTS = new Set(["youtu.be", "www.youtu.be"]);
const PRIVACY_YOUTUBE_HOSTS = new Set([
  "youtube-nocookie.com",
  "www.youtube-nocookie.com"
]);

function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/\.$/, "");
}

function validVideoId(candidate: string | null | undefined): string | null {
  return candidate !== undefined &&
    candidate !== null &&
    YOUTUBE_VIDEO_ID_PATTERN.test(candidate)
    ? candidate
    : null;
}

/**
 * Extracts an 11-character YouTube video ID from explicitly supported URL
 * forms. It deliberately rejects search, channel and playlist-only URLs.
 */
export function parseYouTubeVideoId(input: string): string | null {
  let url: URL;

  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }

  if (
    (url.protocol !== "https:" && url.protocol !== "http:") ||
    url.username !== "" ||
    url.password !== ""
  ) {
    return null;
  }

  const hostname = normalizeHostname(url.hostname);
  if (!YOUTUBE_HOST_SET.has(hostname)) {
    return null;
  }

  const segments = url.pathname.split("/").filter(Boolean);

  if (SHORT_YOUTUBE_HOSTS.has(hostname)) {
    return segments.length === 1 ? validVideoId(segments[0]) : null;
  }

  if (PRIVACY_YOUTUBE_HOSTS.has(hostname)) {
    return segments.length === 2 && segments[0] === "embed"
      ? validVideoId(segments[1])
      : null;
  }

  if (!STANDARD_YOUTUBE_HOSTS.has(hostname)) {
    return null;
  }

  if (segments.length === 1 && segments[0] === "watch") {
    const videoIds = url.searchParams.getAll("v");
    return videoIds.length === 1 ? validVideoId(videoIds[0]) : null;
  }

  if (
    segments.length === 2 &&
    (segments[0] === "live" ||
      segments[0] === "shorts" ||
      segments[0] === "embed")
  ) {
    return validVideoId(segments[1]);
  }

  return null;
}

/**
 * URL approval is intentionally based on an explicit video-ID allowlist.
 * A normal watch URL contains no trustworthy publisher/channel identity, so
 * validating only the youtube.com hostname would not establish ownership.
 */
export function isApprovedYouTubeUrl(
  input: string,
  allowedVideoIds: readonly string[] = APPROVED_YOUTUBE_VIDEO_IDS
): boolean {
  const videoId = parseYouTubeVideoId(input);
  return videoId !== null && allowedVideoIds.includes(videoId);
}

export function isApprovedYouTubeChannelId(
  channelId: string,
  allowedChannelIds: readonly string[] = APPROVED_YOUTUBE_CHANNEL_IDS
): boolean {
  return allowedChannelIds.includes(channelId);
}

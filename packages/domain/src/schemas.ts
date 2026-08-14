import { z } from "zod";
import {
  ANNOUNCEMENT_KINDS,
  EVENT_STATUSES,
  MEDIA_KINDS,
  MEDIA_PROVIDERS,
  PUBLIC_MEDIA_URI_PREFIX,
  SITE,
  TEAM_MEMBER_CATEGORIES
} from "./constants";
import { isValidDateOnly } from "./dates";
import { parseYouTubeVideoId } from "./youtube";

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a lowercase kebab-case slug");
const titleSchema = z.string().trim().min(1).max(200);
const shortTextSchema = z.string().trim().min(1).max(200);
const bodySchema = z.string().trim().min(1).max(20_000);
const nullableBodySchema = z.string().trim().max(20_000).nullable();
const dateTimeSchema = z.iso.datetime({ offset: true });
const nullableDateTimeSchema = dateTimeSchema.nullable();
const dateOnlySchema = z.string().refine(isValidDateOnly, "Use a valid YYYY-MM-DD date");
const nullableDateOnlySchema = dateOnlySchema.nullable();
const httpUrlSchema = z
  .string()
  .trim()
  .url()
  .refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "https:" || protocol === "http:";
  }, "Use an HTTP or HTTPS URL");
const nullableHttpUrlSchema = httpUrlSchema.nullable();
function hasSafeMediaSegments(path: string): boolean {
  const segments = path.split("/").filter(Boolean);

  if (segments.length === 0) {
    return false;
  }

  return segments.every((segment) => {
    try {
      const decoded = decodeURIComponent(segment);
      return (
        decoded !== "." &&
        decoded !== ".." &&
        !decoded.includes("/") &&
        !decoded.includes("\\") &&
        !/[\u0000-\u001F\u007F]/.test(decoded)
      );
    } catch {
      return false;
    }
  });
}

/**
 * Accepts a bundled public asset, a canonical public-media Storage locator,
 * or an HTTPS CDN URL. Bare Storage object keys are deliberately rejected so
 * consumers never have to guess which resolver should handle the value.
 */
function isMediaLocator(value: string): boolean {
  if (value.startsWith("/") && !value.startsWith("//")) {
    return (
      !value.includes("?") &&
      !value.includes("#") &&
      hasSafeMediaSegments(value.slice(1))
    );
  }

  if (value.startsWith(PUBLIC_MEDIA_URI_PREFIX)) {
    const objectKey = value.slice(PUBLIC_MEDIA_URI_PREFIX.length);
    return (
      objectKey !== "" &&
      !objectKey.startsWith("/") &&
      !objectKey.includes("?") &&
      !objectKey.includes("#") &&
      hasSafeMediaSegments(objectKey)
    );
  }

  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname !== "" &&
      url.username === "" &&
      url.password === ""
    );
  } catch {
    return false;
  }
}

const mediaPathSchema = z
  .string()
  .trim()
  .min(1)
  .max(1_000)
  .refine(
    isMediaLocator,
    `Use /path, ${PUBLIC_MEDIA_URI_PREFIX}<object-key>, or an HTTPS URL`
  );
const nullableMediaPathSchema = mediaPathSchema.nullable();
const nullableAltSchema = z.string().trim().min(1).max(300).nullable();
const databaseIdSchema = z.number().int().positive().safe();
const nullableUserIdSchema = z.string().uuid().nullable();
const sortOrderSchema = z.number().int().min(0).max(100_000);

const recordMetadataShape = {
  created_at: dateTimeSchema,
  updated_at: dateTimeSchema,
  created_by: nullableUserIdSchema,
  updated_by: nullableUserIdSchema
} as const;

function addTimeRangeIssue(
  value: { starts_at: string | null; ends_at?: string | null; expires_at?: string | null },
  context: z.RefinementCtx,
  endKey: "ends_at" | "expires_at"
): void {
  const endValue = value[endKey];
  if (
    value.starts_at !== null &&
    endValue !== undefined &&
    endValue !== null &&
    new Date(endValue).getTime() <= new Date(value.starts_at).getTime()
  ) {
    context.addIssue({
      code: "custom",
      path: [endKey],
      message: `${endKey} must be later than starts_at`
    });
  }
}

const eventObjectSchema = z.object({
  id: databaseIdSchema,
  slug: slugSchema,
  title: titleSchema,
  starts_at: dateTimeSchema,
  ends_at: nullableDateTimeSchema,
  timezone: z.literal(SITE.timezone),
  venue_name: shortTextSchema,
  address: z.string().trim().min(1).max(500),
  description: nullableBodySchema,
  status: z.enum(EVENT_STATUSES),
  registration_url: nullableHttpUrlSchema,
  hero_media_path: nullableMediaPathSchema,
  source_url: nullableHttpUrlSchema,
  featured: z.boolean(),
  published: z.boolean(),
  published_at: nullableDateTimeSchema,
  ...recordMetadataShape
});

export const eventSchema = eventObjectSchema.superRefine((value, context) => {
  addTimeRangeIssue(value, context, "ends_at");
});

const announcementObjectSchema = z.object({
  id: databaseIdSchema,
  slug: slugSchema,
  event_id: databaseIdSchema.nullable(),
  kind: z.enum(ANNOUNCEMENT_KINDS),
  title: titleSchema,
  body: bodySchema,
  starts_at: nullableDateTimeSchema,
  expires_at: nullableDateTimeSchema,
  pinned: z.boolean(),
  published: z.boolean(),
  published_at: nullableDateTimeSchema,
  ...recordMetadataShape
});

export const announcementSchema = announcementObjectSchema.superRefine(
  (value, context) => {
    addTimeRangeIssue(value, context, "expires_at");
  }
);

function isYouTubePlaylistUrl(urlValue: string, providerId: string): boolean {
  try {
    const url = new URL(urlValue);
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    return (
      (host === "youtube.com" ||
        host === "www.youtube.com" ||
        host === "m.youtube.com") &&
      url.pathname.replace(/\/$/, "") === "/playlist" &&
      url.searchParams.getAll("list").length === 1 &&
      url.searchParams.get("list") === providerId
    );
  } catch {
    return false;
  }
}

function isInstagramPostUrl(urlValue: string): boolean {
  try {
    const url = new URL(urlValue);
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    const segments = url.pathname.split("/").filter(Boolean);
    return (
      (host === "instagram.com" || host === "www.instagram.com") &&
      segments.length === 2 &&
      (segments[0] === "p" || segments[0] === "reel") &&
      segments[1] !== undefined &&
      segments[1].length > 0
    );
  } catch {
    return false;
  }
}

function validateMediaProvider(
  value: {
    kind: (typeof MEDIA_KINDS)[number];
    provider: (typeof MEDIA_PROVIDERS)[number];
    provider_id: string | null;
    external_url: string | null;
    thumbnail_path: string | null;
  },
  context: z.RefinementCtx
): void {
  const issue = (path: string, message: string): void => {
    context.addIssue({ code: "custom", path: [path], message });
  };

  if (value.kind === "youtube_video") {
    if (value.provider !== "youtube") {
      issue("provider", "A YouTube video must use the youtube provider");
    }
    if (value.external_url === null || value.provider_id === null) {
      issue("external_url", "A YouTube video requires a URL and provider_id");
    } else {
      const parsedId = parseYouTubeVideoId(value.external_url);
      if (parsedId === null) {
        issue("external_url", "Use a supported YouTube video URL");
      } else if (parsedId !== value.provider_id) {
        issue("provider_id", "provider_id must match the YouTube URL");
      }
    }
    return;
  }

  if (value.kind === "youtube_playlist") {
    if (value.provider !== "youtube") {
      issue("provider", "A YouTube playlist must use the youtube provider");
    }
    if (
      value.external_url === null ||
      value.provider_id === null ||
      !isYouTubePlaylistUrl(value.external_url, value.provider_id)
    ) {
      issue(
        "external_url",
        "A YouTube playlist requires matching URL and provider_id values"
      );
    }
    return;
  }

  if (value.kind === "instagram_post") {
    if (value.provider !== "instagram") {
      issue("provider", "An Instagram post must use the instagram provider");
    }
    if (value.external_url === null || !isInstagramPostUrl(value.external_url)) {
      issue("external_url", "Use an Instagram post or reel URL");
    }
    return;
  }

  if (value.provider !== "internal") {
    issue("provider", "An image must use the internal provider");
  }
  if (value.thumbnail_path === null) {
    issue("thumbnail_path", "An internal image requires thumbnail_path");
  }
}

const mediaItemObjectSchema = z.object({
  id: databaseIdSchema,
  slug: slugSchema,
  title: titleSchema,
  kind: z.enum(MEDIA_KINDS),
  provider: z.enum(MEDIA_PROVIDERS),
  provider_id: z.string().trim().min(1).max(150).nullable(),
  external_url: nullableHttpUrlSchema,
  source_label: z.string().trim().min(1).max(200).nullable(),
  thumbnail_path: nullableMediaPathSchema,
  thumbnail_alt: nullableAltSchema,
  occurred_on: nullableDateOnlySchema,
  description: nullableBodySchema,
  featured: z.boolean(),
  sort_order: sortOrderSchema,
  published: z.boolean(),
  published_at: nullableDateTimeSchema,
  ...recordMetadataShape
});

export const mediaItemSchema = mediaItemObjectSchema.superRefine(
  validateMediaProvider
);

const teamMemberObjectSchema = z.object({
  id: databaseIdSchema,
  name: z.string().trim().min(1).max(100),
  role_title: z.string().trim().min(1).max(100),
  category: z.enum(TEAM_MEMBER_CATEGORIES),
  photo_path: nullableMediaPathSchema,
  photo_alt: nullableAltSchema,
  bio: nullableBodySchema,
  sort_order: sortOrderSchema,
  published: z.boolean(),
  published_at: nullableDateTimeSchema,
  ...recordMetadataShape
});

export const teamMemberSchema = teamMemberObjectSchema.superRefine(
  (value, context) => {
    if (value.photo_path !== null && value.photo_alt === null) {
      context.addIssue({
        code: "custom",
        path: ["photo_alt"],
        message: "photo_alt is required when photo_path is set"
      });
    }
  }
);

const siteSettingsObjectSchema = z.object({
  id: z.literal(1),
  name_ko: z.literal(SITE.name_ko),
  name_en: z.literal(SITE.name_en),
  eyebrow: shortTextSchema,
  hero_title: titleSchema,
  hero_description: bodySchema,
  hero_media_path: nullableMediaPathSchema,
  hero_media_mobile_path: nullableMediaPathSchema,
  hero_media_alt: nullableAltSchema,
  about_title: titleSchema,
  about_body: bodySchema,
  about_media_path: nullableMediaPathSchema,
  about_media_alt: nullableAltSchema,
  worship_media_path: nullableMediaPathSchema,
  worship_media_alt: nullableAltSchema,
  visit_media_path: nullableMediaPathSchema,
  visit_media_alt: nullableAltSchema,
  og_media_path: nullableMediaPathSchema,
  logo_primary_path: nullableMediaPathSchema,
  logo_inverse_path: nullableMediaPathSchema,
  instagram_url: z.literal(SITE.instagram_url),
  youtube_channel_url: z.literal(SITE.youtube_channel_url),
  youtube_channel_id: z.literal(SITE.youtube_channel_id),
  church_name: z.literal(SITE.church_name),
  church_url: z.literal(SITE.church_url),
  church_jubilee_url: z.literal(SITE.church_jubilee_url),
  church_location_url: z.literal(SITE.church_location_url),
  address: z.literal(SITE.address),
  phone_display: z.literal(SITE.phone_display),
  phone_href: z.literal(SITE.phone_href),
  contact_email: z.literal(SITE.contact_email),
  naver_map_url: z.literal(SITE.naver_map_url),
  kakao_map_url: z.literal(SITE.kakao_map_url),
  seo_title: z.string().trim().min(1).max(70),
  seo_description: z.string().trim().min(1).max(200),
  updated_at: dateTimeSchema,
  updated_by: nullableUserIdSchema
});

function validateMediaAltPairs(
  value: Record<string, string | number | null>,
  context: z.RefinementCtx
): void {
  const groups = [
    [["hero_media_path", "hero_media_mobile_path"], "hero_media_alt"],
    [["about_media_path"], "about_media_alt"],
    [["worship_media_path"], "worship_media_alt"],
    [["visit_media_path"], "visit_media_alt"]
  ] as const;

  for (const [pathKeys, altKey] of groups) {
    const populatedPath = pathKeys.find((pathKey) => value[pathKey] !== null);
    if (populatedPath !== undefined && value[altKey] === null) {
      context.addIssue({
        code: "custom",
        path: [altKey],
        message: `${altKey} is required when ${populatedPath} is set`
      });
    }
  }
}

export const siteSettingsSchema = siteSettingsObjectSchema.superRefine(
  validateMediaAltPairs
);

export type Event = z.infer<typeof eventSchema>;
export type Announcement = z.infer<typeof announcementSchema>;
export type MediaItem = z.infer<typeof mediaItemSchema>;
export type TeamMember = z.infer<typeof teamMemberSchema>;
export type SiteSettings = z.infer<typeof siteSettingsSchema>;

export {
  dateOnlySchema,
  dateTimeSchema,
  httpUrlSchema,
  mediaPathSchema,
  slugSchema,
  sortOrderSchema,
  validateMediaAltPairs,
  validateMediaProvider
};

import { z } from "zod";
import { ANNOUNCEMENT_KINDS, EVENT_STATUSES, SITE } from "./constants";

const dateTimeSchema = z.iso.datetime({ offset: true });
const dateOnlySchema = z.iso.date();
const idSchema = z.number().int().positive().safe();
const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const optionalTextSchema = (max: number) => z.string().trim().min(1).max(max).nullable();
const httpsUrlSchema = z
  .string()
  .trim()
  .url()
  .refine((value) => new URL(value).protocol === "https:", "Use an HTTPS URL");

export const MOBILE_APP_DEEP_LINK_PATH_PATTERN =
  /^(?:notifications|notification-settings|privacy|worship|media|guide|worship\/[A-Za-z0-9][A-Za-z0-9_-]*(?:\/songlist)?)(?:\?[A-Za-z0-9_%=&.-]+)?$/;

export const mobileAppDeepLinkSchema = z
  .string()
  .trim()
  .max(1_000)
  .refine((value) => {
    const prefix = "jubileeworship://";
    return value.startsWith(prefix)
      && MOBILE_APP_DEEP_LINK_PATH_PATTERN.test(value.slice(prefix.length));
  }, "Use a supported Jubilee Worship app destination");

function isYouTubeListeningUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    if (host === "youtu.be" || host === "www.youtu.be") {
      return url.pathname.split("/").filter(Boolean).length === 1;
    }
    if (![
      "youtube.com",
      "www.youtube.com",
      "m.youtube.com",
      "music.youtube.com"
    ].includes(host)) {
      return false;
    }
    const path = url.pathname.replace(/\/$/, "");
    return (
      (path === "/watch" && url.searchParams.has("v")) ||
      (path === "/playlist" && url.searchParams.has("list")) ||
      path.startsWith("/shorts/") ||
      path.startsWith("/live/")
    );
  } catch {
    return false;
  }
}

export const youtubeListeningUrlSchema = httpsUrlSchema.refine(
  isYouTubeListeningUrl,
  "Use a supported YouTube video or playlist URL"
);

export const mobilePublicSiteSchema = z.object({
  name_ko: z.string().trim().min(1).max(100),
  name_en: z.string().trim().min(1).max(100),
  hero_title: z.string().trim().min(1).max(200),
  hero_description: z.string().trim().min(1).max(2_000),
  hero_media_path: optionalTextSchema(1_000),
  hero_media_mobile_path: optionalTextSchema(1_000),
  hero_media_alt: optionalTextSchema(300),
  visit_media_path: optionalTextSchema(1_000).default(null),
  visit_media_alt: optionalTextSchema(300).default(null),
  instagram_url: httpsUrlSchema,
  youtube_channel_url: httpsUrlSchema,
  church_name: z.string().trim().min(1).max(100),
  church_url: httpsUrlSchema,
  address: z.string().trim().min(1).max(500),
  phone_display: z.string().trim().min(1).max(100),
  naver_map_url: httpsUrlSchema,
  kakao_map_url: httpsUrlSchema,
  about_title: z.string().trim().min(1).max(200),
  about_body: z.string().trim().min(1).max(20_000)
});

export const mobilePublicEventSchema = z.object({
  id: idSchema,
  slug: slugSchema,
  title: z.string().trim().min(1).max(200),
  starts_at: dateTimeSchema,
  ends_at: dateTimeSchema.nullable(),
  timezone: z.literal(SITE.timezone),
  venue_name: z.string().trim().min(1).max(200),
  address: z.string().trim().min(1).max(500),
  description: optionalTextSchema(20_000),
  registration_url: httpsUrlSchema.nullable(),
  hero_media_path: optionalTextSchema(1_000),
  status: z.enum(EVENT_STATUSES),
  featured: z.boolean(),
  source_url: httpsUrlSchema.nullable(),
  sermon_topic: optionalTextSchema(200),
  scripture_reference: optionalTextSchema(300)
});

export const mobilePublicAnnouncementSchema = z.object({
  id: idSchema,
  slug: slugSchema,
  event_id: idSchema.nullable(),
  kind: z.enum(ANNOUNCEMENT_KINDS),
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(20_000),
  starts_at: dateTimeSchema.nullable(),
  expires_at: dateTimeSchema.nullable(),
  pinned: z.boolean()
});

export const mobilePublicMediaItemSchema = z.object({
  id: idSchema,
  slug: slugSchema,
  title: z.string().trim().min(1).max(200),
  provider_id: z.string().trim().min(1).max(150),
  external_url: youtubeListeningUrlSchema,
  source_label: optionalTextSchema(200),
  thumbnail_path: z.string().trim().min(1).max(1_000),
  thumbnail_alt: optionalTextSchema(300),
  occurred_on: dateOnlySchema.nullable(),
  description: optionalTextSchema(20_000),
  featured: z.boolean(),
  sort_order: z.number().int().min(0).max(100_000)
});

export const mobilePublicSetlistItemSchema = z.object({
  id: idSchema,
  position: z.number().int().positive().max(100),
  title: z.string().trim().min(1).max(200),
  artist: optionalTextSchema(200),
  musical_key: optionalTextSchema(20).default(null),
  youtube_url: youtubeListeningUrlSchema.nullable()
});

export const mobilePublicSetlistSchema = z
  .object({
    event_id: idSchema,
    event_slug: slugSchema,
    revision_no: z.number().int().positive(),
    published_at: dateTimeSchema,
    playlist_url: youtubeListeningUrlSchema.nullable(),
    is_changed: z.boolean(),
    items: z.array(mobilePublicSetlistItemSchema).max(100)
  })
  .superRefine((value, context) => {
    const positions = new Set<number>();
    for (const [index, item] of value.items.entries()) {
      if (positions.has(item.position)) {
        context.addIssue({
          code: "custom",
          path: ["items", index, "position"],
          message: "Song positions must be unique"
        });
      }
      positions.add(item.position);
    }
  });

export const mobilePublicGalleryItemSchema = z.object({
  id: idSchema,
  media_path: z.string().trim().min(1).max(1_000),
  thumbnail_path: optionalTextSchema(1_000),
  alt: z.string().trim().min(1).max(300),
  caption: optionalTextSchema(2_000),
  occurred_on: dateOnlySchema.nullable(),
  sort_order: z.number().int().min(0).max(100_000)
});

export const mobilePublicGuideSectionSchema = z.object({
  id: idSchema,
  slug: slugSchema,
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(20_000),
  kind: z.enum(["first_visit", "parking", "transit"]),
  sort_order: z.number().int().min(0).max(100_000)
});

export const mobilePublicLegalDocumentSchema = z.object({
  id: idSchema,
  document_type: z.enum(["privacy_policy", "terms_of_service"]),
  version: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(100_000),
  effective_on: dateOnlySchema,
  published_at: dateTimeSchema
});

export const mobilePublicContentSchema = z.object({
  site: mobilePublicSiteSchema,
  events: z.array(mobilePublicEventSchema),
  announcements: z.array(mobilePublicAnnouncementSchema),
  media: z.array(mobilePublicMediaItemSchema),
  setlists: z.array(mobilePublicSetlistSchema),
  gallery: z.array(mobilePublicGalleryItemSchema),
  guide: z.array(mobilePublicGuideSectionSchema),
  legal: z.array(mobilePublicLegalDocumentSchema),
  fetched_at: dateTimeSchema
});

export type MobilePublicSite = z.infer<typeof mobilePublicSiteSchema>;
export type MobilePublicEvent = z.infer<typeof mobilePublicEventSchema>;
export type MobilePublicAnnouncement = z.infer<typeof mobilePublicAnnouncementSchema>;
export type MobilePublicMediaItem = z.infer<typeof mobilePublicMediaItemSchema>;
export type MobilePublicSetlist = z.infer<typeof mobilePublicSetlistSchema>;
export type MobilePublicSetlistItem = z.infer<typeof mobilePublicSetlistItemSchema>;
export type MobilePublicGalleryItem = z.infer<typeof mobilePublicGalleryItemSchema>;
export type MobilePublicGuideSection = z.infer<typeof mobilePublicGuideSectionSchema>;
export type MobilePublicLegalDocument = z.infer<typeof mobilePublicLegalDocumentSchema>;
export type MobilePublicContent = z.infer<typeof mobilePublicContentSchema>;

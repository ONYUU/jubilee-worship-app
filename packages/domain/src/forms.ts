import { z } from "zod";
import {
  ANNOUNCEMENT_KINDS,
  EVENT_STATUSES,
  MEDIA_KINDS,
  MEDIA_PROVIDERS,
  SITE,
  TEAM_MEMBER_CATEGORIES
} from "./constants";
import { isValidDateOnly, normalizeSeoulDateTimeInput } from "./dates";
import {
  httpUrlSchema,
  mediaPathSchema,
  slugSchema,
  sortOrderSchema,
  validateMediaAltPairs,
  validateMediaProvider
} from "./schemas";
import { parseYouTubeVideoId } from "./youtube";

const requiredTitle = z.string().trim().min(1).max(200);
const requiredShortText = z.string().trim().min(1).max(200);
const requiredBody = z.string().trim().min(1).max(20_000);
const nullableText = (maxLength: number) =>
  z.preprocess(
    (value) =>
      value === undefined ||
      value === null ||
      (typeof value === "string" && value.trim() === "")
        ? null
        : value,
    z.string().trim().max(maxLength).nullable()
  );
const nullableHttpUrl = z.preprocess(
  (value) =>
    value === undefined ||
    value === null ||
    (typeof value === "string" && value.trim() === "")
      ? null
      : value,
  httpUrlSchema.nullable()
);
const nullableMediaPath = z.preprocess(
  (value) =>
    value === undefined ||
    value === null ||
    (typeof value === "string" && value.trim() === "")
      ? null
      : value,
  mediaPathSchema.nullable()
);
const nullableAlt = z.preprocess(
  (value) =>
    value === undefined ||
    value === null ||
    (typeof value === "string" && value.trim() === "")
      ? null
      : value,
  z.string().trim().min(1).max(300).nullable()
);

const checkboxBoolean = z.preprocess((value) => {
  if (
    value === undefined ||
    value === null ||
    value === "" ||
    value === "0" ||
    value === "false" ||
    value === "off" ||
    value === false ||
    value === 0
  ) {
    return false;
  }
  if (
    value === "1" ||
    value === "true" ||
    value === "on" ||
    value === "yes" ||
    value === true ||
    value === 1
  ) {
    return true;
  }
  return value;
}, z.boolean());

const requiredFormDateTime = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }
  return normalizeSeoulDateTimeInput(value) ?? value;
}, z.iso.datetime({ offset: true }));

const nullableFormDateTime = z.preprocess((value) => {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== "string") {
    return value;
  }
  if (value.trim() === "") {
    return null;
  }
  return normalizeSeoulDateTimeInput(value) ?? value;
}, z.iso.datetime({ offset: true }).nullable());

const nullableDatabaseId = z.preprocess((value) => {
  if (
    value === undefined ||
    value === null ||
    (typeof value === "string" && value.trim() === "")
  ) {
    return null;
  }
  return value;
}, z.coerce.number().int().positive().safe().nullable());

const formSortOrder = z.preprocess(
  (value) =>
    value === undefined ||
    value === null ||
    (typeof value === "string" && value.trim() === "")
      ? 100
      : value,
  z.coerce.number().pipe(sortOrderSchema)
);

const nullableDateOnly = z.preprocess((value) => {
  if (
    value === undefined ||
    value === null ||
    (typeof value === "string" && value.trim() === "")
  ) {
    return null;
  }
  return value;
}, z.string().refine(isValidDateOnly, "Use a valid YYYY-MM-DD date").nullable());

function addRangeIssue(
  startsAt: string | null,
  endsAt: string | null,
  endPath: "ends_at" | "expires_at",
  context: z.RefinementCtx
): void {
  if (
    startsAt !== null &&
    endsAt !== null &&
    new Date(endsAt).getTime() <= new Date(startsAt).getTime()
  ) {
    context.addIssue({
      code: "custom",
      path: [endPath],
      message: `${endPath} must be later than starts_at`
    });
  }
}

export const eventFormSchema = z
  .object({
    slug: slugSchema,
    title: requiredTitle,
    starts_at: requiredFormDateTime,
    ends_at: nullableFormDateTime,
    timezone: z.literal(SITE.timezone).default(SITE.timezone),
    venue_name: requiredShortText.default(SITE.venue_name),
    address: z.string().trim().min(1).max(500).default(SITE.address_road),
    description: nullableText(20_000),
    status: z.enum(EVENT_STATUSES).default("scheduled"),
    registration_url: nullableHttpUrl,
    hero_media_path: nullableMediaPath,
    source_url: nullableHttpUrl,
    featured: checkboxBoolean,
    published: checkboxBoolean
  })
  .superRefine((value, context) => {
    addRangeIssue(value.starts_at, value.ends_at, "ends_at", context);
  });

export const announcementFormSchema = z
  .object({
    slug: slugSchema,
    event_id: nullableDatabaseId,
    kind: z.enum(ANNOUNCEMENT_KINDS).default("normal"),
    title: requiredTitle,
    body: requiredBody,
    starts_at: nullableFormDateTime,
    expires_at: nullableFormDateTime,
    pinned: checkboxBoolean,
    published: checkboxBoolean
  })
  .superRefine((value, context) => {
    addRangeIssue(value.starts_at, value.expires_at, "expires_at", context);
  });

function normalizeMediaFormInput(value: unknown): unknown {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return value;
  }

  const input = { ...value } as Record<string, unknown>;
  const kind = input.kind;

  if (kind === "youtube_video" || kind === "youtube_playlist") {
    input.provider = "youtube";
  } else if (kind === "instagram_post") {
    input.provider = "instagram";
  } else if (kind === "image") {
    input.provider = "internal";
  }

  if (
    kind === "youtube_video" &&
    typeof input.external_url === "string" &&
    (input.provider_id === undefined ||
      input.provider_id === null ||
      input.provider_id === "")
  ) {
    input.provider_id = parseYouTubeVideoId(input.external_url);
  }

  return input;
}

const mediaFormObjectSchema = z.object({
  slug: slugSchema,
  title: requiredTitle,
  kind: z.enum(MEDIA_KINDS),
  provider: z.enum(MEDIA_PROVIDERS),
  provider_id: nullableText(150),
  external_url: nullableHttpUrl,
  source_label: nullableText(200),
  thumbnail_path: nullableMediaPath,
  thumbnail_alt: nullableAlt,
  occurred_on: nullableDateOnly,
  description: nullableText(20_000),
  featured: checkboxBoolean,
  sort_order: formSortOrder,
  published: checkboxBoolean
});

export const mediaFormSchema = z
  .preprocess(
    normalizeMediaFormInput,
    mediaFormObjectSchema.superRefine(validateMediaProvider)
  )
  .superRefine((value, context) => {
    if (value.thumbnail_path !== null && value.thumbnail_alt === null) {
      context.addIssue({
        code: "custom",
        path: ["thumbnail_alt"],
        message: "thumbnail_alt is required when thumbnail_path is set"
      });
    }
  });

export const teamMemberFormSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    role_title: z.string().trim().min(1).max(100),
    category: z.enum(TEAM_MEMBER_CATEGORIES).default("minister"),
    photo_path: nullableMediaPath,
    photo_alt: nullableAlt,
    bio: nullableText(20_000),
    sort_order: formSortOrder,
    published: checkboxBoolean
  })
  .superRefine((value, context) => {
    if (value.photo_path !== null && value.photo_alt === null) {
      context.addIssue({
        code: "custom",
        path: ["photo_alt"],
        message: "photo_alt is required when photo_path is set"
      });
    }
  });

const settingsFormObjectSchema = z.object({
  name_ko: z.literal(SITE.name_ko).default(SITE.name_ko),
  name_en: z.literal(SITE.name_en).default(SITE.name_en),
  eyebrow: requiredShortText,
  hero_title: requiredTitle,
  hero_description: requiredBody,
  hero_media_path: nullableMediaPath,
  hero_media_mobile_path: nullableMediaPath,
  hero_media_alt: nullableAlt,
  about_title: requiredTitle,
  about_body: requiredBody,
  about_media_path: nullableMediaPath,
  about_media_alt: nullableAlt,
  worship_media_path: nullableMediaPath,
  worship_media_alt: nullableAlt,
  visit_media_path: nullableMediaPath,
  visit_media_alt: nullableAlt,
  og_media_path: nullableMediaPath,
  logo_primary_path: nullableMediaPath,
  logo_inverse_path: nullableMediaPath,
  instagram_url: z.literal(SITE.instagram_url).default(SITE.instagram_url),
  youtube_channel_url: z
    .literal(SITE.youtube_channel_url)
    .default(SITE.youtube_channel_url),
  youtube_channel_id: z
    .literal(SITE.youtube_channel_id)
    .default(SITE.youtube_channel_id),
  church_name: z.literal(SITE.church_name).default(SITE.church_name),
  church_url: z.literal(SITE.church_url).default(SITE.church_url),
  church_jubilee_url: z
    .literal(SITE.church_jubilee_url)
    .default(SITE.church_jubilee_url),
  church_location_url: z
    .literal(SITE.church_location_url)
    .default(SITE.church_location_url),
  address: z.literal(SITE.address).default(SITE.address),
  phone_display: z.literal(SITE.phone_display).default(SITE.phone_display),
  phone_href: z.literal(SITE.phone_href).default(SITE.phone_href),
  contact_email: z.literal(SITE.contact_email).default(SITE.contact_email),
  naver_map_url: z.literal(SITE.naver_map_url).default(SITE.naver_map_url),
  kakao_map_url: z.literal(SITE.kakao_map_url).default(SITE.kakao_map_url),
  seo_title: z.string().trim().min(1).max(70),
  seo_description: z.string().trim().min(1).max(200)
});

export const settingsFormSchema = settingsFormObjectSchema.superRefine(
  validateMediaAltPairs
);

export type EventForm = z.infer<typeof eventFormSchema>;
export type AnnouncementForm = z.infer<typeof announcementFormSchema>;
export type MediaForm = z.infer<typeof mediaFormSchema>;
export type TeamMemberForm = z.infer<typeof teamMemberFormSchema>;
export type SettingsForm = z.infer<typeof settingsFormSchema>;

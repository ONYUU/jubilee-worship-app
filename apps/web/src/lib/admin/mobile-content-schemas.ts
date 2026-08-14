import { mediaPathSchema, slugSchema, youtubeListeningUrlSchema } from "@jubilee/domain";
import { z } from "zod";

export const adminRecordIdSchema = z.number().int().positive().safe();
const sortOrderSchema = z.number().int().min(0).max(100_000);
const GALLERY_STAGING_PREFIX = "storage://gallery-staging/";

const galleryStagingPathSchema = z
  .string()
  .trim()
  .min(1)
  .max(1_000)
  .refine((value) => {
    if (!value.startsWith(GALLERY_STAGING_PREFIX)) return false;
    const objectPath = value.slice(GALLERY_STAGING_PREFIX.length);
    const segments = objectPath.split("/");
    return segments.length > 0
      && segments.every((segment) => segment !== "" && segment !== "." && segment !== "..")
      && !/[\\?#%]/.test(objectPath);
  }, "Use a safe private gallery staging object path");

const galleryMediaPathSchema = z.union([mediaPathSchema, galleryStagingPathSchema]);

function nullableText(maxLength: number) {
  return z.string().trim().min(1).max(maxLength).nullable();
}

export const sermonRevisionFormSchema = z.object({
  event_id: adminRecordIdSchema,
  sermon_topic: nullableText(200),
  scripture_reference: nullableText(300)
});

export const eventSetlistFormSchema = z.object({
  event_id: adminRecordIdSchema,
  playlist_url: youtubeListeningUrlSchema.nullable()
});

export const setlistItemFormSchema = z.object({
  setlist_id: adminRecordIdSchema,
  position: z.number().int().min(1).max(100),
  title: z.string().trim().min(1).max(200),
  artist: nullableText(200),
  musical_key: nullableText(20),
  youtube_url: youtubeListeningUrlSchema.nullable()
});

export const galleryItemFormSchema = z.object({
  media_path: galleryMediaPathSchema,
  thumbnail_path: galleryMediaPathSchema.nullable(),
  alt: z.string().trim().min(1).max(300),
  caption: nullableText(2_000),
  occurred_on: z.iso.date().nullable(),
  sort_order: sortOrderSchema
});

export const guideSectionFormSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(20_000),
  kind: z.enum(["first_visit", "parking", "transit"]),
  sort_order: sortOrderSchema
});

export const legalDocumentFormSchema = z.object({
  document_type: z.enum(["privacy_policy", "terms_of_service"]),
  version: z.string().trim().min(1).max(64),
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(100_000),
  effective_on: z.iso.date()
});

export const notificationCampaignIdSchema = z.uuid("알림 캠페인 식별값을 확인해 주세요.");

export const notificationCampaignFormSchema = z
  .object({
    kind: z.enum(["test", "worship_reminder", "schedule_change", "setlist_update"]),
    title: z.string().trim().min(1).max(120),
    body: z.string().trim().min(1).max(500),
    deep_link: z
      .string()
      .trim()
      .regex(/^jubileeworship:\/\/[A-Za-z0-9/_?=&.%-]+$/)
      .max(1_000)
      .nullable(),
    audience_kind: z.enum([
      "test_endpoint",
      "worship_reminder",
      "schedule_changes",
      "setlist_updates",
      "all_opted_in"
    ]),
    event_id: adminRecordIdSchema.nullable(),
    test_push_endpoint_id: z.uuid().nullable(),
    dedupe_key: z.string().trim().regex(/^[A-Za-z0-9:._-]{1,160}$/)
  })
  .superRefine((value, context) => {
    const isTest = value.kind === "test";
    if (isTest !== (value.audience_kind === "test_endpoint") || isTest !== Boolean(value.test_push_endpoint_id)) {
      context.addIssue({
        code: "custom",
        path: ["audience_kind"],
        message: "시험 캠페인은 시험 기기와 함께 설정해야 합니다."
      });
    }
  });

export const testPushFormSchema = z.object({
  installation_id: z.uuid("시험 기기 ID를 확인해 주세요."),
  installation_secret: z.string().trim().min(1).max(128),
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(500),
  deep_link: z
    .string()
    .trim()
    .regex(/^jubileeworship:\/\/[A-Za-z0-9/_?=&.%-]+$/)
    .max(1_000)
    .nullable()
});

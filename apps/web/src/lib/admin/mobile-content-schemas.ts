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
export const testPushAppVariantSchema = z.enum(["development", "preview"]);

const normalizedTestPushPairingCodeSchema = z
  .string()
  .trim()
  .min(1, "앱에 표시된 연결 코드를 입력해 주세요.")
  .max(20)
  .transform((value) => value
    .toUpperCase()
    .replaceAll("-", "")
    .replaceAll(" ", "")
    .replaceAll("O", "0")
    .replace(/[IL]/g, "1"))
  .pipe(z.string().regex(/^[0-9A-HJKMNP-TV-Z]{12}$/, "연결 코드 형식을 확인해 주세요."));

export const testPushPairingApprovalFormSchema = z.object({
  pairing_code: normalizedTestPushPairingCodeSchema
});

export const testPushTargetListSchema = z.array(z.object({
  push_endpoint_id: z.uuid(),
  app_variant: testPushAppVariantSchema,
  display_label: z.string().trim().min(1).max(200)
}).strict()).max(100);

export const worshipReminderScheduleFormSchema = z.object({
  event_id: adminRecordIdSchema,
  day_before_title: z.string().trim().min(1).max(120),
  day_before_body: z.string().trim().min(1).max(500),
  one_hour_title: z.string().trim().min(1).max(120),
  one_hour_body: z.string().trim().min(1).max(500)
});

export const worshipReminderScheduleResultSchema = z.object({
  reminder_slot: z.enum(["day_before_1930", "one_hour_before"]),
  campaign_id: z.uuid(),
  scheduled_for: z.iso.datetime({ offset: true }),
  status: z.enum(["approved", "queued", "processing", "completed", "failed"]),
  requires_action: z.boolean()
});

export const worshipReminderScheduleListSchema = z.array(z.object({
  campaign_id: z.uuid(),
  event_id: adminRecordIdSchema,
  event_slug: z.string().trim().min(1).max(200),
  event_title: z.string().trim().min(1).max(200),
  reminder_slot: z.enum(["day_before_1930", "one_hour_before"]),
  scheduled_for: z.iso.datetime({ offset: true }),
  event_starts_at_snapshot: z.iso.datetime({ offset: true }),
  current_event_starts_at: z.iso.datetime({ offset: true }),
  status: z.enum(["draft", "approved", "queued", "processing", "completed", "cancelled", "failed"]),
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(500),
  approved_at: z.iso.datetime({ offset: true }).nullable(),
  queued_at: z.iso.datetime({ offset: true }).nullable(),
  completed_at: z.iso.datetime({ offset: true }).nullable(),
  requires_reapproval: z.boolean()
}));

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

const testPushTargetSelectionSchema = z
  .string()
  .trim()
  .min(1, "시험 기기를 선택해 주세요.")
  .max(64)
  .transform((value) => {
    const separator = value.indexOf(":");
    return {
      app_variant: separator < 0 ? "" : value.slice(0, separator),
      push_endpoint_id: separator < 0 ? "" : value.slice(separator + 1)
    };
  })
  .pipe(z.object({
    app_variant: testPushAppVariantSchema,
    push_endpoint_id: z.uuid("시험 기기 식별값을 확인해 주세요.")
  }));

export const testPushFormSchema = z.object({
  request_id: z.uuid("시험 요청 식별값을 확인해 주세요."),
  target: testPushTargetSelectionSchema,
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(500),
  deep_link: z
    .string()
    .trim()
    .regex(/^jubileeworship:\/\/[A-Za-z0-9/_?=&.%-]+$/)
    .max(1_000)
    .nullable()
});

export function testPushEdgeRequestBody(input: z.infer<typeof testPushFormSchema>) {
  return {
    requestId: input.request_id,
    pushEndpointId: input.target.push_endpoint_id,
    appVariant: input.target.app_variant,
    title: input.title,
    body: input.body,
    deepLink: input.deep_link
  };
}

export function testPushPairingApprovalEdgeRequestBody(
  input: z.infer<typeof testPushPairingApprovalFormSchema>
) {
  return { pairingCode: input.pairing_code };
}

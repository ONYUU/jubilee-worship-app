import { describe, expect, it } from "vitest";
import {
  eventSetlistFormSchema,
  galleryItemFormSchema,
  guideSectionFormSchema,
  legalDocumentFormSchema,
  notificationCampaignFormSchema,
  reinstallRecoveryApprovalFormSchema,
  reinstallRecoveryChallengeListSchema,
  sermonRevisionFormSchema,
  setlistItemFormSchema,
  testPushEdgeRequestBody,
  testPushFormSchema,
  testPushPairingApprovalEdgeRequestBody,
  testPushPairingApprovalFormSchema,
  testPushTargetListSchema,
  worshipReminderScheduleFormSchema,
  worshipReminderScheduleListSchema,
  worshipReminderScheduleResultSchema
} from "./mobile-content-schemas";
import { reinstallRecoveryCodeDigest } from "./reinstall-recovery";

describe("mobile admin content schemas", () => {
  it("accepts complete sermon drafts within their database limits", () => {
    const sermon = {
      event_id: 1,
      sermon_topic: "두려움보다 큰 믿음",
      scripture_reference: "시편 27:1-6"
    };
    expect(sermonRevisionFormSchema.safeParse(sermon).success).toBe(true);
    expect(
      sermonRevisionFormSchema.safeParse({ ...sermon, sermon_topic: "가".repeat(201) }).success
    ).toBe(false);
    expect(
      sermonRevisionFormSchema.safeParse({
        event_id: 1,
        sermon_topic: null,
        scripture_reference: null
      }).success
    ).toBe(true);
  });

  it("limits a setlist to a supported YouTube listening URL", () => {
    expect(
      eventSetlistFormSchema.safeParse({
        event_id: 1,
        playlist_url: "https://www.youtube.com/playlist?list=official"
      }).success
    ).toBe(true);
    expect(
      eventSetlistFormSchema.safeParse({
        event_id: 1,
        playlist_url: "https://example.com/playlist"
      }).success
    ).toBe(false);
  });

  it("validates song position and musical key", () => {
    const song = {
      setlist_id: 1,
      position: 1,
      title: "주 이름 찬양",
      artist: "Jubilee Worship",
      musical_key: "F#m",
      youtube_url: null
    };
    expect(setlistItemFormSchema.safeParse(song).success).toBe(true);
    expect(setlistItemFormSchema.safeParse({ ...song, position: 101 }).success).toBe(false);
    expect(setlistItemFormSchema.safeParse({ ...song, musical_key: "K".repeat(21) }).success).toBe(false);
  });

  it("validates gallery locators and guide kinds", () => {
    expect(
      galleryItemFormSchema.safeParse({
        media_path: "storage://public-media/app-gallery/2026/08/worship.webp",
        thumbnail_path: null,
        alt: "함께 찬양하는 예배자들",
        caption: null,
        occurred_on: "2026-08-14",
        sort_order: 10
      }).success
    ).toBe(true);
    expect(
      galleryItemFormSchema.safeParse({
        media_path: "storage://gallery-staging/gallery/2026/08/worship.webp",
        thumbnail_path: null,
        alt: "함께 찬양하는 예배자들",
        caption: null,
        occurred_on: null,
        sort_order: 10
      }).success
    ).toBe(true);
    expect(
      galleryItemFormSchema.safeParse({
        media_path: "storage://gallery-staging/../private.webp",
        thumbnail_path: null,
        alt: "안전하지 않은 경로",
        caption: null,
        occurred_on: null,
        sort_order: 10
      }).success
    ).toBe(false);
    expect(
      guideSectionFormSchema.safeParse({
        slug: "first-visit",
        title: "처음 오셨나요?",
        body: "예배 시작 전에 안내팀을 찾아주세요.",
        kind: "first_visit",
        sort_order: 10
      }).success
    ).toBe(true);
    expect(
      guideSectionFormSchema.safeParse({
        slug: "food",
        title: "식사",
        body: "안내",
        kind: "food",
        sort_order: 10
      }).success
    ).toBe(false);
  });

  it("validates legal document drafts and notification contracts", () => {
    expect(
      legalDocumentFormSchema.safeParse({
        document_type: "privacy_policy",
        version: "2026-08-15",
        title: "개인정보처리방침",
        body: "본문",
        effective_on: "2026-08-15"
      }).success
    ).toBe(true);

    const campaign = {
      kind: "schedule_change",
      title: "예배 시간 변경",
      body: "이번 주 예배 시간을 확인해 주세요.",
      deep_link: "jubileeworship://worship/upcoming",
      audience_kind: "schedule_changes",
      event_id: 1,
      test_push_endpoint_id: null,
      dedupe_key: "schedule-change:event-1:20260815"
    };
    expect(notificationCampaignFormSchema.safeParse(campaign).success).toBe(true);
    expect(
      notificationCampaignFormSchema.safeParse({
        ...campaign,
        deep_link: "jubileeworship://notificaitons"
      }).success
    ).toBe(false);
    expect(
      notificationCampaignFormSchema.safeParse({ ...campaign, kind: "test" }).success
    ).toBe(false);
  });

  it("accepts only an explicit development or preview test target without a secret", () => {
    const parsed = testPushFormSchema.safeParse({
      request_id: "56d6d48f-c70a-4b80-87d4-bc366de8788d",
      target: "development:550e8400-e29b-41d4-a716-446655440000",
      title: "시험 알림",
      body: "시험 기기에만 보냅니다.",
      deep_link: null
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const requestBody = testPushEdgeRequestBody(parsed.data);
      expect(requestBody).toEqual({
        requestId: "56d6d48f-c70a-4b80-87d4-bc366de8788d",
        pushEndpointId: "550e8400-e29b-41d4-a716-446655440000",
        appVariant: "development",
        title: "시험 알림",
        body: "시험 기기에만 보냅니다.",
        deepLink: null
      });
      expect(Object.keys(requestBody).some((key) => /secret|token|installation/i.test(key))).toBe(false);
    }
    expect(
      testPushFormSchema.safeParse({
        request_id: "56d6d48f-c70a-4b80-87d4-bc366de8788d",
        target: "production:550e8400-e29b-41d4-a716-446655440000",
        title: "시험 알림",
        body: "운영 기기는 시험 대상에서 제외합니다.",
        deep_link: null
      }).success
    ).toBe(false);
    expect(
      testPushFormSchema.safeParse({
        request_id: "56d6d48f-c70a-4b80-87d4-bc366de8788d",
        target: "preview:not-a-uuid",
        title: "시험 알림",
        body: "잘못된 대상을 거부합니다.",
        deep_link: null
      }).success
    ).toBe(false);
    expect(
      testPushFormSchema.safeParse({
        request_id: "not-a-uuid",
        target: "preview:550e8400-e29b-41d4-a716-446655440000",
        title: "시험 알림",
        body: "재시도 멱등성 식별값이 필요합니다.",
        deep_link: null
      }).success
    ).toBe(false);
  });

  it("normalizes a one-time pairing code without exposing a digest or installation secret", () => {
    const parsed = testPushPairingApprovalFormSchema.safeParse({
      pairing_code: "2h7k-9m4q-wx3d"
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const requestBody = testPushPairingApprovalEdgeRequestBody(parsed.data);
      expect(requestBody).toEqual({ pairingCode: "2H7K9M4QWX3D" });
      expect(Object.keys(requestBody).some((key) => /digest|hash|secret|token|installation/i.test(key))).toBe(false);
    }
    expect(testPushPairingApprovalFormSchema.safeParse({ pairing_code: "1234" }).success).toBe(false);
  });

  it("accepts only the masked minimum metadata returned for test targets", () => {
    const target = {
      push_endpoint_id: "550e8400-e29b-41d4-a716-446655440000",
      app_variant: "preview",
      display_label: "미리보기 · Android · 기기 …440000 · 앱 0.1.0"
    };
    expect(testPushTargetListSchema.safeParse([target]).success).toBe(true);
    expect(
      testPushTargetListSchema.safeParse([{
        ...target,
        expo_push_token: "ExpoPushToken[must_not_reach_the_browser]"
      }]).success
    ).toBe(false);
  });

  it("normalizes a 128-bit reinstall recovery capability and hashes it before Supabase", () => {
    const parsed = reinstallRecoveryApprovalFormSchema.safeParse({
      challenge_id: "550e8400-e29b-41d4-a716-446655440000",
      recovery_code: "7m4k-9p2t-8w3x-6y5z-1a2b-3c4d-5e"
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.recovery_code).toBe("7M4K9P2T8W3X6Y5Z1A2B3C4D5E");
      expect(reinstallRecoveryCodeDigest(parsed.data.recovery_code)).toBe(
        "20cbe18066b63f0669a7628eeb6bcc10509d2907ccb19f7f879382f39218580c"
      );
    }
    expect(reinstallRecoveryApprovalFormSchema.safeParse({
      challenge_id: "550e8400-e29b-41d4-a716-446655440000",
      recovery_code: "SHORT-CODE"
    }).success).toBe(false);
  });

  it("accepts only masked reinstall recovery list metadata", () => {
    const challenge = {
      challenge_id: "550e8400-e29b-41d4-a716-446655440000",
      app_variant: "preview",
      source_display_label: "미리보기 · Android · 이전 기기 …446655440000",
      target_display_label: "미리보기 · Android · 새 설치 …446655550000",
      created_at: "2026-08-20T10:00:00+00:00",
      expires_at: "2026-08-20T10:10:00+00:00"
    };
    expect(reinstallRecoveryChallengeListSchema.safeParse([challenge]).success).toBe(true);
    expect(reinstallRecoveryChallengeListSchema.safeParse([{
      ...challenge,
      expo_push_token: "ExpoPushToken[must_not_reach_the_browser]"
    }]).success).toBe(false);
  });

  it("validates both approved worship reminder messages", () => {
    const schedule = {
      event_id: 1,
      day_before_title: "내일 예배가 있습니다",
      day_before_body: "예배 시간과 장소를 확인해 주세요.",
      one_hour_title: "예배 1시간 전입니다",
      one_hour_body: "곧 예배가 시작됩니다."
    };
    expect(worshipReminderScheduleFormSchema.safeParse(schedule).success).toBe(true);
    expect(
      worshipReminderScheduleFormSchema.safeParse({ ...schedule, one_hour_body: "" }).success
    ).toBe(false);
  });

  it("accepts the two-slot reminder RPC and reapproval list contract", () => {
    const campaignId = "550e8400-e29b-41d4-a716-446655440000";
    expect(worshipReminderScheduleResultSchema.safeParse({
      reminder_slot: "day_before_1930",
      campaign_id: campaignId,
      scheduled_for: "2026-09-03T10:30:00+00:00",
      status: "approved",
      requires_action: false
    }).success).toBe(true);
    expect(worshipReminderScheduleResultSchema.safeParse({
      reminder_slot: "day_before_1930",
      campaign_id: campaignId,
      scheduled_for: "2026-09-03T10:30:00+00:00"
    }).success).toBe(false);
    expect(worshipReminderScheduleListSchema.safeParse([{
      campaign_id: campaignId,
      event_id: 1,
      event_slug: "jubilee-worship-2026-09-04",
      event_title: "쥬빌리워십 찬양집회",
      reminder_slot: "one_hour_before",
      scheduled_for: "2026-09-04T10:00:00+00:00",
      event_starts_at_snapshot: "2026-09-04T11:00:00+00:00",
      current_event_starts_at: "2026-09-04T11:30:00+00:00",
      status: "cancelled",
      title: "예배 1시간 전입니다",
      body: "예배 시간을 확인해 주세요.",
      approved_at: "2026-08-15T03:00:00+00:00",
      queued_at: null,
      completed_at: null,
      requires_reapproval: true
    }]).success).toBe(true);
  });
});

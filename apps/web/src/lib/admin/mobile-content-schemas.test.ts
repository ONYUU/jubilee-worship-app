import { describe, expect, it } from "vitest";
import {
  eventSetlistFormSchema,
  galleryItemFormSchema,
  guideSectionFormSchema,
  legalDocumentFormSchema,
  notificationCampaignFormSchema,
  sermonRevisionFormSchema,
  setlistItemFormSchema,
  testPushFormSchema
} from "./mobile-content-schemas";

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
      notificationCampaignFormSchema.safeParse({ ...campaign, kind: "test" }).success
    ).toBe(false);
  });

  it("requires a private installation secret for test push", () => {
    expect(
      testPushFormSchema.safeParse({
        installation_id: "550e8400-e29b-41d4-a716-446655440000",
        installation_secret: "private-installation-secret",
        title: "시험 알림",
        body: "시험 기기에만 보냅니다.",
        deep_link: null
      }).success
    ).toBe(true);
  });
});

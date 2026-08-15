import "server-only";

import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { APPROVED_YOUTUBE_VIDEO_IDS } from "@jubilee/domain";
import { z } from "zod";
import { SERVICE_IDENTITY } from "@/lib/site-identity";
import {
  SITE,
  events as localEvents,
  gallery,
  getActiveAnnouncements,
  mediaItems as localMediaItems,
  teamMembers as localTeamMembers,
  type Announcement,
  type MediaItem,
  type TeamMember,
  type WorshipEvent
} from "./local-content";

export interface PublicContent {
  site: PublicSite;
  events: WorshipEvent[];
  announcements: Announcement[];
  mediaItems: MediaItem[];
  teamMembers: TeamMember[];
  gallery: typeof gallery;
}

export interface PublicLegalDocument {
  id: number;
  document_type: "privacy_policy" | "terms_of_service";
  version: string;
  title: string;
  body: string;
  effective_on: string;
  published_at: string;
}

const publicLegalDocumentSchema = z.object({
  id: z.number().int().positive(),
  document_type: z.enum(["privacy_policy", "terms_of_service"]),
  version: z.string().trim().min(1).max(64),
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(100_000),
  effective_on: z.iso.date(),
  published_at: z.iso.datetime({ offset: true })
});

export type PublicSite = { -readonly [Key in keyof typeof SITE]: string };

const APPROVED_YOUTUBE_VIDEO_ID_SET = new Set<string>(APPROVED_YOUTUBE_VIDEO_IDS);

interface PublicSiteRow {
  name_ko: string;
  name_en: string;
  eyebrow: string;
  hero_title: string;
  hero_description: string;
  hero_media_path: string | null;
  hero_media_mobile_path: string | null;
  hero_media_alt: string | null;
  about_title: string;
  about_body: string;
  about_media_path: string | null;
  about_media_alt: string | null;
  worship_media_path: string | null;
  worship_media_alt: string | null;
  visit_media_path: string | null;
  visit_media_alt: string | null;
  og_media_path: string | null;
  logo_primary_path: string | null;
  logo_inverse_path: string | null;
  instagram_url: string;
  youtube_channel_url: string;
  youtube_channel_id: string;
  church_name: string;
  church_url: string;
  church_jubilee_url: string;
  church_location_url: string;
  address: string;
  phone_display: string;
  phone_href: string;
  naver_map_url: string;
  kakao_map_url: string;
  seo_title: string;
  seo_description: string;
}

interface PublicEventRow {
  id: number;
  slug: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  timezone: string;
  venue_name: string;
  address: string;
  description: string | null;
  registration_url: string | null;
  hero_media_path: string | null;
  status: WorshipEvent["status"];
  featured: boolean;
  source_url: string | null;
}

interface PublicAnnouncementRow {
  id: number;
  slug: string;
  kind: Announcement["kind"];
  title: string;
  body: string;
  starts_at: string | null;
  expires_at: string | null;
  pinned: boolean;
}

interface PublicMediaRow {
  id: number;
  slug: string;
  title: string;
  kind: string;
  provider: string;
  provider_id: string | null;
  external_url: string | null;
  source_label: string | null;
  thumbnail_path: string | null;
  thumbnail_alt: string | null;
  occurred_on: string | null;
  description: string | null;
  featured: boolean;
  sort_order: number;
}

interface PublicTeamRow {
  id: number;
  name: string;
  role_title: string;
  category: string;
  photo_path: string | null;
  photo_alt: string | null;
  bio: string | null;
  sort_order: number;
}

function localContent(): PublicContent {
  return {
    site: SITE,
    events: localEvents,
    announcements: getActiveAnnouncements(),
    mediaItems: localMediaItems,
    teamMembers: localTeamMembers,
    gallery
  };
}

function hasSupabaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}

export function resolvePublicMediaPath(path: string): string {
  const prefix = "storage://public-media/";
  if (!path.startsWith(prefix)) return path;
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!projectUrl) {
    throw new Error("Storage 이미지 URL을 만들 Supabase 설정이 없습니다.");
  }
  const objectKey = path.slice(prefix.length).split("/").map(encodeURIComponent).join("/");
  const baseUrl = projectUrl.endsWith("/") ? projectUrl : `${projectUrl}/`;
  return new URL(`storage/v1/object/public/public-media/${objectKey}`, baseUrl).toString();
}

async function loadPublicContent(): Promise<PublicContent> {
  const source = process.env.CONTENT_SOURCE ?? "local";

  if (source !== "supabase") {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[content] Local seed content is enabled. Set CONTENT_SOURCE=supabase before public deployment."
      );
    }
    return localContent();
  }

  if (!hasSupabaseConfig()) {
    throw new Error("Supabase 공개 콘텐츠 연결에 필요한 환경 변수가 없습니다.");
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const [siteResult, eventResult, announcementResult, mediaResult, teamResult] = await Promise.all([
    supabase.from("public_site_settings").select("*").limit(1).maybeSingle(),
    supabase.from("public_events").select("*").order("starts_at", { ascending: true }),
    supabase
      .from("public_announcements")
      .select("*")
      .order("pinned", { ascending: false })
      .order("starts_at", { ascending: false, nullsFirst: false })
      .order("id", { ascending: false }),
    supabase
      .from("public_media_items")
      .select("*")
      .order("featured", { ascending: false })
      .order("occurred_on", { ascending: false, nullsFirst: false })
      .order("sort_order", { ascending: true }),
    supabase
      .from("public_team_members")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })
  ]);

  const firstError = [
    siteResult.error,
    eventResult.error,
    announcementResult.error,
    mediaResult.error,
    teamResult.error
  ].find(Boolean);
  if (firstError) {
    throw new Error("공개 콘텐츠를 불러오지 못했습니다.");
  }

  const row = siteResult.data as PublicSiteRow | null;
  if (!row) {
    throw new Error("Supabase 공개 사이트 설정(id=1)이 없습니다.");
  }

  const site: PublicSite = {
    nameKo: row.name_ko,
    nameEn: row.name_en,
    operatorName: SERVICE_IDENTITY.operatorName,
    contactEmail: SERVICE_IDENTITY.contactEmail,
    eyebrow: row.eyebrow,
    heroTitle: row.hero_title,
    heroDescription: row.hero_description,
    heroImageAlt: row.hero_media_alt ?? SITE.heroImageAlt,
    aboutTitle: row.about_title,
    aboutBody: row.about_body,
    instagramUrl: row.instagram_url,
    youtubeChannelUrl: row.youtube_channel_url,
    youtubeChannelId: row.youtube_channel_id,
    churchName: row.church_name,
    churchUrl: row.church_url,
    churchJubileeUrl: row.church_jubilee_url,
    churchLocationUrl: row.church_location_url,
    postalCode: SITE.postalCode,
    address: row.address,
    shortAddress: row.address.split(" (")[0] ?? row.address,
    phoneDisplay: row.phone_display,
    phoneHref: row.phone_href.startsWith("tel:") ? row.phone_href : `tel:${row.phone_href}`,
    naverMapUrl: row.naver_map_url,
    kakaoMapUrl: row.kakao_map_url,
    logoPath: resolvePublicMediaPath(row.logo_primary_path ?? SITE.logoPath),
    logoInversePath: resolvePublicMediaPath(row.logo_inverse_path ?? SITE.logoInversePath),
    heroDesktopPath: resolvePublicMediaPath(row.hero_media_path ?? SITE.heroDesktopPath),
    heroMobilePath: resolvePublicMediaPath(row.hero_media_mobile_path ?? SITE.heroMobilePath),
    aboutImagePath: resolvePublicMediaPath(row.about_media_path ?? SITE.aboutImagePath),
    aboutImageAlt: row.about_media_alt ?? SITE.aboutImageAlt,
    worshipImagePath: resolvePublicMediaPath(row.worship_media_path ?? SITE.worshipImagePath),
    worshipImageAlt: row.worship_media_alt ?? SITE.worshipImageAlt,
    visitImagePath: resolvePublicMediaPath(row.visit_media_path ?? SITE.visitImagePath),
    visitImageAlt: row.visit_media_alt ?? SITE.visitImageAlt,
    ogImagePath: resolvePublicMediaPath(row.og_media_path ?? SITE.ogImagePath),
    seoTitle: row.seo_title,
    seoDescription: row.seo_description
  };

  const events = (eventResult.data as PublicEventRow[]).map((row) => ({
    id: String(row.id),
    slug: row.slug,
    title: row.title,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    timezone: "Asia/Seoul" as const,
    venueName: row.venue_name,
    address: row.address,
    description: row.description ?? "누구나 함께 예배할 수 있습니다.",
    registrationUrl: row.registration_url,
    heroMediaPath: row.hero_media_path ? resolvePublicMediaPath(row.hero_media_path) : null,
    status: row.status,
    featured: row.featured,
    published: true,
    sourceUrl: row.source_url ?? site.instagramUrl
  }));

  const announcements = (announcementResult.data as PublicAnnouncementRow[]).map((row) => ({
    id: String(row.id),
    slug: row.slug,
    kind: row.kind,
    title: row.title,
    body: row.body,
    startsAt: row.starts_at,
    expiresAt: row.expires_at,
    pinned: row.pinned,
    published: true
  }));

  const mediaItems = (mediaResult.data as PublicMediaRow[])
    .filter(
      (row) =>
        row.kind === "youtube_video" &&
        row.provider === "youtube" &&
        row.provider_id !== null &&
        APPROVED_YOUTUBE_VIDEO_ID_SET.has(row.provider_id) &&
        row.external_url !== null &&
        row.thumbnail_path !== null
    )
    .map((row) => ({
      id: String(row.id),
      slug: row.slug,
      title: row.title,
      providerId: row.provider_id!,
      externalUrl: row.external_url!,
      sourceLabel: row.source_label ?? "Jubilee Worship(쥬빌리 워십)",
      thumbnailPath: resolvePublicMediaPath(row.thumbnail_path!),
      thumbnailAlt: row.thumbnail_alt ?? `${row.title} 영상 썸네일`,
      occurredOn: row.occurred_on,
      description: row.description ?? "쥬빌리워십 예배 영상입니다.",
      featured: row.featured,
      published: true
    }));

  const teamMembers = (teamResult.data as PublicTeamRow[])
    .filter((row) => row.category === "minister")
    .map((row) => ({
      id: String(row.id),
      name: row.name,
      roleTitle: row.role_title,
      category: "minister" as const,
      photoPath: row.photo_path ? resolvePublicMediaPath(row.photo_path) : null,
      photoAlt: row.photo_alt,
      bio: row.bio,
      sortOrder: row.sort_order,
      published: true
    }));

  return { site, events, announcements, mediaItems, teamMembers, gallery };
}

async function loadPublicPrivacyPolicy(): Promise<PublicLegalDocument | null> {
  const source = process.env.CONTENT_SOURCE ?? "local";
  if (source !== "supabase") return null;
  if (!hasSupabaseConfig()) {
    throw new Error("Supabase 공개 콘텐츠 연결에 필요한 환경 변수가 없습니다.");
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { data, error } = await supabase
    .from("public_legal_documents")
    .select("id,document_type,version,title,body,effective_on,published_at")
    .eq("document_type", "privacy_policy")
    .order("effective_on", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error("공개 개인정보처리방침을 불러오지 못했습니다.");
  if (data === null) return null;
  const parsed = publicLegalDocumentSchema.safeParse(data);
  if (!parsed.success) throw new Error("공개 개인정보처리방침 형식이 올바르지 않습니다.");
  return parsed.data;
}

export const getPublicContent = cache(loadPublicContent);
export const getPublicPrivacyPolicy = cache(loadPublicPrivacyPolicy);

export function selectNextPublicEvent(events: WorshipEvent[], now = new Date()) {
  return (
    events
      .filter(
        (event) =>
          event.published &&
          (event.status === "scheduled" || event.status === "postponed") &&
          Date.parse(event.startsAt) >= now.getTime()
      )
      .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))[0] ?? null
  );
}

export function selectUpcomingPublicEvents(events: WorshipEvent[], now = new Date()) {
  return events
    .filter(
      (event) =>
        event.published &&
        event.status !== "completed" &&
        Date.parse(event.startsAt) >= now.getTime()
    )
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
}

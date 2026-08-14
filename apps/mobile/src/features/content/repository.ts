import {
  mobilePublicAnnouncementSchema,
  mobilePublicContentSchema,
  mobilePublicGalleryItemSchema,
  mobilePublicGuideSectionSchema,
  mobilePublicLegalDocumentSchema,
  mobilePublicMediaItemSchema,
  mobilePublicSetlistSchema,
  type MobilePublicContent,
  type MobilePublicSetlistItem
} from "@jubilee/domain";
import { createClient } from "@supabase/supabase-js";
import { createLocalContent } from "./local-content";

type UnknownRow = Record<string, unknown>;

function requiredPublicConfig(): { url: string; key: string } {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("공개 콘텐츠 서버 설정이 없습니다.");
  }
  return { url, key };
}

type OptionalParser<T> = {
  safeParse: (value: unknown) => { success: true; data: T } | { success: false };
};

function parseOptionalDataset<T>(
  parser: OptionalParser<T>,
  value: unknown,
  fallback: T
): T {
  const parsed = parser.safeParse(value);
  return parsed.success ? parsed.data : fallback;
}

async function loadFromSupabase(
  fallback: MobilePublicContent | null
): Promise<MobilePublicContent> {
  const { url, key } = requiredPublicConfig();
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });

  const [site, events, announcements, media, setlists, items, gallery, guide, legal] =
    await Promise.all([
      client
        .from("public_site_settings")
        .select("name_ko,name_en,hero_title,hero_description,hero_media_path,hero_media_mobile_path,hero_media_alt,instagram_url,youtube_channel_url,church_name,church_url,address,phone_display,naver_map_url,kakao_map_url,about_title,about_body")
        .limit(1)
        .maybeSingle(),
      client
        .from("public_events")
        .select("id,slug,title,starts_at,ends_at,timezone,venue_name,address,description,status,registration_url,hero_media_path,featured,source_url,sermon_topic,scripture_reference")
        .order("starts_at", { ascending: true }),
      client
        .from("public_announcements")
        .select("id,slug,event_id,kind,title,body,starts_at,expires_at,pinned")
        .order("pinned", { ascending: false })
        .order("starts_at", { ascending: false, nullsFirst: false }),
      client
        .from("public_media_items")
        .select("id,slug,title,provider_id,external_url,source_label,thumbnail_path,thumbnail_alt,occurred_on,description,featured,sort_order,kind")
        .eq("kind", "youtube_video")
        .order("featured", { ascending: false })
        .order("occurred_on", { ascending: false, nullsFirst: false }),
      client
        .from("public_event_setlists")
        .select("event_id,event_slug,revision_no,published_at,playlist_url,is_changed")
        .order("published_at", { ascending: false }),
      client
        .from("public_setlist_items")
        .select("id,event_id,position,title,artist,musical_key,youtube_url")
        .order("position", { ascending: true }),
      client
        .from("public_gallery_items")
        .select("id,media_path,thumbnail_path,alt,caption,occurred_on,sort_order")
        .order("sort_order", { ascending: true }),
      client
        .from("public_guide_sections")
        .select("id,slug,title,body,kind,sort_order")
        .order("sort_order", { ascending: true }),
      client
        .from("public_legal_documents")
        .select("id,document_type,version,title,body,effective_on,published_at")
        .order("effective_on", { ascending: false })
    ]);

  if (site.error || events.error) {
    throw new Error("필수 공개 콘텐츠를 불러오지 못했습니다.");
  }
  if (!site.data) throw new Error("공개 사이트 설정이 없습니다.");

  const itemRows = items.error ? [] : (items.data ?? []) as UnknownRow[];
  const assembledSetlists = setlists.error || items.error
    ? fallback?.setlists ?? []
    : ((setlists.data ?? []) as UnknownRow[]).map((setlist) => ({
        ...setlist,
        items: itemRows.filter((item) => item.event_id === setlist.event_id) as MobilePublicSetlistItem[]
      }));
  const content = {
    site: site.data,
    events: ((events.data ?? []) as UnknownRow[]).map((row) => ({
      ...row,
      sermon_topic: row.sermon_topic ?? null,
      scripture_reference: row.scripture_reference ?? null
    })),
    announcements: announcements.error
      ? fallback?.announcements ?? []
      : parseOptionalDataset(
          mobilePublicAnnouncementSchema.array(),
          announcements.data ?? [],
          fallback?.announcements ?? []
        ),
    media: media.error
      ? fallback?.media ?? []
      : parseOptionalDataset(
          mobilePublicMediaItemSchema.array(),
          media.data ?? [],
          fallback?.media ?? []
        ),
    setlists: parseOptionalDataset(
      mobilePublicSetlistSchema.array(),
      assembledSetlists,
      fallback?.setlists ?? []
    ),
    gallery: gallery.error
      ? fallback?.gallery ?? []
      : parseOptionalDataset(
          mobilePublicGalleryItemSchema.array(),
          gallery.data ?? [],
          fallback?.gallery ?? []
        ),
    guide: guide.error
      ? fallback?.guide ?? []
      : parseOptionalDataset(
          mobilePublicGuideSectionSchema.array(),
          guide.data ?? [],
          fallback?.guide ?? []
        ),
    legal: legal.error
      ? fallback?.legal ?? []
      : parseOptionalDataset(
          mobilePublicLegalDocumentSchema.array(),
          legal.data ?? [],
          fallback?.legal ?? []
        ),
    fetched_at: new Date().toISOString()
  };

  return mobilePublicContentSchema.parse(content);
}

export async function loadPublicContent(
  fallback: MobilePublicContent | null = null
): Promise<MobilePublicContent> {
  const source = process.env.EXPO_PUBLIC_CONTENT_SOURCE ?? (__DEV__ ? "local" : null);
  if (!source) {
    throw new Error("운영 콘텐츠 모드가 설정되지 않았습니다.");
  }
  if (source === "local") return createLocalContent();
  if (source !== "supabase") throw new Error("지원하지 않는 콘텐츠 모드입니다.");
  return loadFromSupabase(fallback);
}

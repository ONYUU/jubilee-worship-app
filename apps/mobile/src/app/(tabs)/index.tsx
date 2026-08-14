import { EventCard } from "@/components/event-card";
import { Screen } from "@/components/screen";
import { Card, EmptyState, ErrorState, LoadingState, SectionHeading } from "@/components/ui";
import { useContent } from "@/features/content/content-provider";
import { resolveMediaSource } from "@/features/content/media-source";
import { selectNextMobileEvent, selectSetlistForEvent } from "@/features/content/selectors";
import { openExternalUrl } from "@/features/links/open-external-url";
import { colors, radii, spacing, typography } from "@/theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function HomeScreen() {
  const router = useRouter();
  const { content, error, loading, refresh } = useContent();

  if (loading && !content) return <Screen><LoadingState /></Screen>;
  if (error && !content) return <Screen><ErrorState message={error} retry={() => void refresh()} /></Screen>;
  if (!content) return null;

  const nextEvent = selectNextMobileEvent(content.events);
  const setlist = nextEvent ? selectSetlistForEvent(content.setlists, nextEvent.id) : null;
  const notice = content.announcements[0] ?? null;
  const featured = content.media[0] ?? null;

  return (
    <Screen>
      <View style={styles.hero}>
        <Image
          source={resolveMediaSource(content.site.hero_media_mobile_path ?? content.site.hero_media_path)}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          accessibilityLabel={content.site.hero_media_alt ?? content.site.hero_title}
        />
        <LinearGradient
          colors={["rgba(13,28,42,0.08)", "rgba(13,28,42,0.24)", "rgba(13,28,42,0.88)"]}
          locations={[0, 0.46, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.heroTop}>
          <Text accessibilityRole="header" style={styles.heroName}>{content.site.name_ko}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="알림함 열기"
            hitSlop={8}
            onPress={() => router.push("/notifications")}
            style={({ pressed }) => [styles.heroNotice, pressed && styles.pressed]}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.white} />
          </Pressable>
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.heroEyebrow}>Sundoo Church Worship Ministry</Text>
          <Text style={styles.heroTitle}>{content.site.hero_title}</Text>
          <Text style={styles.heroDescription} numberOfLines={3}>{content.site.hero_description}</Text>
        </View>
      </View>

      {notice ? (
        <Card>
          <View style={styles.noticeRow}>
            <Ionicons name="megaphone-outline" size={20} color={colors.danger} />
            <View style={styles.noticeCopy}>
              <Text style={styles.noticeTitle}>{notice.title}</Text>
              <Text style={styles.noticeBody} numberOfLines={2}>{notice.body}</Text>
            </View>
          </View>
        </Card>
      ) : null}

      <SectionHeading title="다가오는 예배" />
      {nextEvent ? (
        <EventCard
          event={nextEvent}
          setlist={setlist}
          naverMapUrl={content.site.naver_map_url}
          kakaoMapUrl={content.site.kakao_map_url}
          variant="summary"
        />
      ) : (
        <EmptyState title="다음 예배를 준비하고 있습니다" description="새 일정이 확정되면 이곳에 안내됩니다." />
      )}

      {nextEvent ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="이번 주 워십 송리스트 전체 보기"
          onPress={() =>
            router.push({
              pathname: "/worship/[slug]/songlist",
              params: { slug: nextEvent.slug }
            })
          }
          style={({ pressed }) => [styles.songlistCard, pressed && styles.pressed]}
        >
          <View style={styles.songlistHeader}>
            <View>
              <Text style={styles.songlistEyebrow}>This Week</Text>
              <Text style={styles.songlistTitle}>이번 주 워십 송리스트</Text>
            </View>
            <Text style={styles.songlistAction}>전체 보기 ›</Text>
          </View>
          {setlist && setlist.items.length > 0 ? (
            setlist.items.slice(0, 3).map((item) => (
              <View key={item.id} style={styles.songRow}>
                <Text style={styles.songPosition}>{String(item.position).padStart(2, "0")}</Text>
                <Text style={styles.songTitle} numberOfLines={1}>{item.title}</Text>
                {item.musical_key ? <Text style={styles.songKey}>KEY {item.musical_key}</Text> : null}
              </View>
            ))
          ) : (
            <View style={styles.songPreparing}>
              <Ionicons name="musical-notes-outline" size={19} color={colors.active} />
              <Text style={styles.songPreparingText}>송리스트를 준비하고 있습니다</Text>
            </View>
          )}
        </Pressable>
      ) : null}

      {featured ? (
        <>
          <SectionHeading title="최근 예배 영상" />
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`${featured.title} YouTube에서 열기`}
            onPress={() => void openExternalUrl(featured.external_url)}
            style={({ pressed }) => [styles.mediaCard, pressed && styles.pressed]}
          >
            <Image
              source={resolveMediaSource(featured.thumbnail_path)}
              style={styles.mediaImage}
              contentFit="cover"
              cachePolicy="memory-disk"
              accessibilityLabel={featured.thumbnail_alt ?? featured.title}
            />
            <View style={styles.playButton}>
              <Ionicons name="play" size={22} color={colors.text} />
            </View>
            <View style={styles.mediaCopy}>
              <Text style={styles.mediaTitle} numberOfLines={2}>{featured.title}</Text>
              <Text style={styles.mediaSource}>{featured.source_label}</Text>
            </View>
          </Pressable>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    height: 390,
    marginHorizontal: -spacing.md,
    marginTop: -spacing.md,
    justifyContent: "space-between",
    overflow: "hidden"
  },
  heroTop: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  heroName: { ...typography.title, color: colors.white },
  heroNotice: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.52)",
    backgroundColor: "rgba(13,28,42,0.28)",
    alignItems: "center",
    justifyContent: "center"
  },
  heroCopy: { padding: spacing.lg, gap: spacing.xs },
  heroEyebrow: {
    ...typography.caption,
    color: colors.white,
    letterSpacing: 1.2,
    textTransform: "uppercase"
  },
  heroTitle: { ...typography.display, color: colors.white },
  heroDescription: { ...typography.body, color: "rgba(255,255,255,0.86)" },
  noticeRow: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  noticeCopy: { flex: 1, gap: 3 },
  noticeTitle: { ...typography.label, color: colors.text },
  noticeBody: { ...typography.caption, color: colors.muted },
  mediaCard: {
    borderRadius: radii.lg,
    overflow: "hidden",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line
  },
  mediaImage: { width: "100%", aspectRatio: 16 / 9 },
  playButton: {
    position: "absolute",
    top: 70,
    left: "50%",
    marginLeft: -25,
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.94)"
  },
  mediaCopy: { padding: spacing.md, gap: 4 },
  mediaTitle: { ...typography.label, color: colors.text },
  mediaSource: { ...typography.caption, color: colors.muted },
  songlistCard: {
    borderRadius: radii.lg,
    padding: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing.xs
  },
  songlistHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: spacing.xs
  },
  songlistEyebrow: {
    ...typography.caption,
    color: colors.active,
    letterSpacing: 0.8,
    textTransform: "uppercase"
  },
  songlistTitle: { ...typography.heading, color: colors.text },
  songlistAction: { ...typography.label, color: colors.active },
  songRow: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line
  },
  songPosition: { ...typography.label, color: colors.active, width: 24 },
  songTitle: { ...typography.body, color: colors.text, flex: 1 },
  songKey: { ...typography.caption, color: colors.active },
  songPreparing: {
    minHeight: 54,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  songPreparingText: { ...typography.body, color: colors.muted },
  pressed: { opacity: 0.7 }
});

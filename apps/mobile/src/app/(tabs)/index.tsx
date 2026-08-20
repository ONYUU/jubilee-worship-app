import { AppHeader } from "@/components/app-header";
import { Screen } from "@/components/screen";
import { ActionButton, EmptyState, ErrorState, LoadingState, SectionHeading } from "@/components/ui";
import { useContent } from "@/features/content/content-provider";
import { resolveMediaSource } from "@/features/content/media-source";
import {
  formatDday,
  formatEventDate,
  selectHomeHeroMediaPath,
  selectNextMobileEvent,
  selectSetlistForEvent
} from "@/features/content/selectors";
import { addEventToCalendar, openMapChoices } from "@/features/events/actions";
import { useAppThemeStyles } from "@/theme/theme-provider";
import { radii, spacing, typography, type ThemeColors } from "@/theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function HomeScreen() {
  const router = useRouter();
  const { content, error, loading, refresh } = useContent();
  const { colors, styles } = useAppThemeStyles(createStyles);

  if (loading && !content) return <Screen><LoadingState /></Screen>;
  if (error && !content) return <Screen><ErrorState message={error} retry={() => void refresh()} /></Screen>;
  if (!content) return null;

  const nextEvent = selectNextMobileEvent(content.events);
  const nextEventImage = resolveMediaSource(selectHomeHeroMediaPath(content.site));
  const setlist = nextEvent ? selectSetlistForEvent(content.setlists, nextEvent.id) : null;
  const notice = content.announcements[0] ?? null;
  const songlistHref = nextEvent
    ? { pathname: "/worship/[slug]/songlist" as const, params: { slug: nextEvent.slug } }
    : null;

  return (
    <Screen>
      <AppHeader title={content.site.name_ko} notifications />

      {nextEvent ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${nextEvent.title}, ${formatEventDate(nextEvent.starts_at)}, ${formatDday(nextEvent.starts_at)}, ${nextEvent.venue_name}, 예배 상세 보기`}
          onPress={() =>
            router.push({ pathname: "/worship/[slug]", params: { slug: nextEvent.slug } })
          }
          style={({ pressed }) => [styles.feature, pressed && styles.pressed]}
        >
          {nextEventImage ? (
            <Image
              source={nextEventImage}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              cachePolicy="memory-disk"
              accessibilityLabel={content.site.hero_media_alt ?? `${nextEvent.title} 예배 사진`}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.featureFallback]} />
          )}
          <LinearGradient
            colors={["rgba(10,18,24,0.02)", "rgba(10,18,24,0.2)", "rgba(10,18,24,0.92)"]}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.featureCopy}>
            <View style={styles.featureBadge}>
              <Text style={styles.featureBadgeText}>
                {nextEvent.status === "postponed" ? "일정 변경" : "다가오는 예배"}
              </Text>
            </View>
            <Text style={styles.featureTitle}>{nextEvent.title}</Text>
            <Text style={styles.featureMeta}>
              {formatEventDate(nextEvent.starts_at)} · {formatDday(nextEvent.starts_at)}
            </Text>
            <Text style={styles.featureVenue}>{nextEvent.venue_name}</Text>
          </View>
        </Pressable>
      ) : (
        <EmptyState
          title="다음 예배를 준비하고 있습니다"
          description="관리자가 공개한 일정이 이곳에 표시됩니다."
        />
      )}

      {notice ? (
        <View accessibilityRole="alert" style={styles.noticeRow}>
          <Ionicons name="megaphone-outline" size={19} color={colors.danger} />
          <View style={styles.noticeCopy}>
            <Text style={styles.noticeTitle}>{notice.title}</Text>
            <Text style={styles.noticeBody} numberOfLines={2}>{notice.body}</Text>
          </View>
        </View>
      ) : null}

      {nextEvent ? (
        <>
          <View style={styles.infoSection}>
            <Text style={styles.sectionEyebrow}>이번 예배 말씀</Text>
            {nextEvent.sermon_topic || nextEvent.scripture_reference ? (
              <>
                {nextEvent.sermon_topic ? (
                  <Text style={styles.sermonTitle}>{nextEvent.sermon_topic}</Text>
                ) : null}
                {nextEvent.scripture_reference ? (
                  <Text style={styles.sermonVerse}>본문 · {nextEvent.scripture_reference}</Text>
                ) : null}
              </>
            ) : (
              <Text style={styles.preparing}>설교 주제와 말씀 구절을 준비하고 있습니다</Text>
            )}
          </View>

          <View style={styles.songlistSection}>
            <SectionHeading
              title="이번 주 송리스트"
              action={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="이번 주 송리스트 전체 보기"
                  onPress={() => songlistHref && router.push(songlistHref)}
                  style={({ pressed }) => [styles.headingAction, pressed && styles.pressed]}
                >
                  <Text style={styles.headingActionText}>
                    {setlist?.items.length ? `${setlist.items.length}곡` : "전체 보기"}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                </Pressable>
              }
            />
            <View style={styles.songlistPanel}>
              {setlist && setlist.items.length > 0 ? (
                setlist.items.slice(0, 3).map((item, index) => (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.position}번 ${item.title}, 송리스트 전체 보기`}
                    onPress={() => songlistHref && router.push(songlistHref)}
                    style={({ pressed }) => [
                      styles.songRow,
                      index > 0 && styles.rowDivider,
                      pressed && styles.rowPressed
                    ]}
                  >
                    <Text style={styles.songPosition}>{String(item.position).padStart(2, "0")}</Text>
                    <Text style={styles.songTitle} numberOfLines={1}>{item.title}</Text>
                    <Ionicons name="chevron-forward" size={17} color={colors.muted} />
                  </Pressable>
                ))
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="준비 중인 송리스트 상세 보기"
                  onPress={() => songlistHref && router.push(songlistHref)}
                  style={({ pressed }) => [styles.preparingRow, pressed && styles.rowPressed]}
                >
                  <Ionicons name="musical-notes-outline" size={19} color={colors.active} />
                  <Text style={styles.preparing}>송리스트를 준비하고 있습니다</Text>
                  <Ionicons name="chevron-forward" size={17} color={colors.muted} />
                </Pressable>
              )}
            </View>
          </View>

          <View style={styles.quickActions}>
            <View style={styles.actionCell}>
              <ActionButton
                label="예배 캘린더"
                icon="calendar-outline"
                disabled={nextEvent.status === "cancelled"}
                onPress={() => void addEventToCalendar(nextEvent)}
              />
            </View>
            <View style={styles.actionCell}>
              <ActionButton
                label="오시는 길"
                icon="navigate-outline"
                onPress={() =>
                  openMapChoices(
                    nextEvent,
                    content.site.naver_map_url,
                    content.site.kakao_map_url
                  )
                }
              />
            </View>
          </View>
        </>
      ) : null}
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    feature: {
      minHeight: 232,
      marginHorizontal: -spacing.md,
      overflow: "hidden",
      justifyContent: "flex-end",
      backgroundColor: colors.secondarySurface
    },
    featureFallback: { backgroundColor: colors.secondarySurface },
    featureCopy: { padding: spacing.md, gap: 3 },
    featureBadge: {
      alignSelf: "flex-start",
      borderRadius: radii.sm,
      backgroundColor: colors.cta,
      borderWidth: 1,
      borderColor: colors.ctaBorder,
      paddingHorizontal: spacing.xs,
      paddingVertical: 4,
      marginBottom: 2
    },
    featureBadgeText: {
      ...typography.caption,
      color: colors.onCta,
      paddingRight: spacing.xxs
    },
    featureTitle: { ...typography.title, fontSize: 22, lineHeight: 28, color: colors.onPhoto },
    featureMeta: { ...typography.label, color: colors.onPhoto },
    featureVenue: { ...typography.caption, color: "rgba(255,255,255,0.82)" },
    noticeRow: {
      minHeight: 52,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
      paddingVertical: spacing.sm
    },
    noticeCopy: { flex: 1, gap: 2 },
    noticeTitle: { ...typography.label, color: colors.text },
    noticeBody: { ...typography.caption, color: colors.muted },
    infoSection: {
      gap: 4,
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
      paddingVertical: spacing.xs
    },
    sectionEyebrow: { ...typography.label, color: colors.text },
    sermonTitle: { ...typography.heading, color: colors.text },
    sermonVerse: { ...typography.caption, color: colors.muted },
    preparing: { ...typography.body, color: colors.muted, flex: 1 },
    songlistSection: { gap: spacing.xs },
    headingAction: {
      minHeight: 44,
      paddingLeft: spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      gap: 2
    },
    headingActionText: { ...typography.caption, color: colors.muted },
    songlistPanel: {
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: radii.sm,
      overflow: "hidden",
      backgroundColor: colors.card
    },
    songRow: {
      minHeight: 48,
      paddingHorizontal: spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm
    },
    rowDivider: { borderTopWidth: 1, borderTopColor: colors.line },
    rowPressed: { backgroundColor: colors.raised },
    songPosition: { ...typography.label, color: colors.active, width: 24 },
    songTitle: { ...typography.body, color: colors.text, flex: 1 },
    preparingRow: {
      minHeight: 54,
      paddingHorizontal: spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm
    },
    quickActions: { flexDirection: "row", gap: spacing.xs },
    actionCell: { flex: 1 },
    pressed: { opacity: 0.72 }
  });
}

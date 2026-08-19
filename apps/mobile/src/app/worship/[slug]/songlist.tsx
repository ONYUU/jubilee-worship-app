import { AppHeader } from "@/components/app-header";
import { Screen } from "@/components/screen";
import { ActionButton, EmptyState, ErrorState, LoadingState } from "@/components/ui";
import { useContent } from "@/features/content/content-provider";
import { formatEventDate, selectSetlistForEvent } from "@/features/content/selectors";
import { createAppDeepLink } from "@/features/links/current-app-deep-link";
import { openExternalUrl } from "@/features/links/open-external-url";
import { useAppThemeStyles } from "@/theme/theme-provider";
import { radii, spacing, typography, type ThemeColors } from "@/theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { Alert, Pressable, Share, StyleSheet, Text, View } from "react-native";

export default function SonglistScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { content, error, loading, refresh } = useContent();
  const { colors, styles } = useAppThemeStyles(createStyles);

  if (loading && !content) return <Screen><LoadingState /></Screen>;
  if (error && !content) return <Screen><ErrorState message={error} retry={() => void refresh()} /></Screen>;

  const event = content?.events.find((candidate) => candidate.slug === slug) ?? null;
  const setlist = event && content ? selectSetlistForEvent(content.setlists, event.id) : null;

  async function shareSonglist() {
    try {
      const webOrigin = process.env.EXPO_PUBLIC_WEB_ORIGIN?.replace(/\/$/, "");
      await Share.share({
        title: `${event?.title ?? "예배"} 송리스트`,
        message: [
          `${event?.title ?? "예배"} 워십 송리스트`,
          webOrigin ? `${webOrigin}/worship` : null,
          event ? createAppDeepLink(`worship/${event.slug}/songlist`) : null
        ]
          .filter(Boolean)
          .join("\n")
      });
    } catch {
      Alert.alert("공유하지 못했습니다", "잠시 후 다시 시도해 주세요.");
    }
  }

  if (!event) {
    return (
      <Screen>
        <AppHeader title="이번 주 송리스트" back />
        <EmptyState title="예배를 찾을 수 없습니다" description="공개 상태가 변경됐거나 잘못된 링크입니다." />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader
        title="이번 주 송리스트"
        back
        actionIcon="share-outline"
        actionLabel="송리스트 공유"
        onActionPress={() => void shareSonglist()}
      />

      <View style={styles.eventMeta}>
        <Text style={styles.eventDate}>{formatEventDate(event.starts_at)}</Text>
        <Text style={styles.eventTitle}>{event.title}</Text>
        {setlist ? (
          <View style={styles.publishRow}>
            <Text style={styles.publishMeta}>
              {new Intl.DateTimeFormat("ko-KR", {
                timeZone: "Asia/Seoul",
                month: "long",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit"
              }).format(new Date(setlist.published_at))} 공개
            </Text>
            {setlist.is_changed ? (
              <View style={styles.changedBadge}>
                <Text style={styles.changedText}>변경됨</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      {!setlist || setlist.items.length === 0 ? (
        <EmptyState
          title="이번 주 송리스트를 준비하고 있습니다"
          description="관리자가 확인하고 공개한 곡만 이곳에 표시됩니다."
        />
      ) : (
        <View style={styles.songList}>
          {setlist.items.map((item, index) => (
            <View key={item.id} style={[styles.songRow, index > 0 && styles.songDivider]}>
              <Text style={styles.position}>{String(item.position).padStart(2, "0")}</Text>
              <View style={styles.songCopy}>
                <Text style={styles.songTitle}>{item.title}</Text>
                {item.artist || item.musical_key ? (
                  <Text style={styles.songMeta}>
                    {[item.artist, item.musical_key ? `Key ${item.musical_key}` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                ) : null}
              </View>
              {item.youtube_url ? (
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={`${item.title} YouTube에서 듣기`}
                  onPress={() => void openExternalUrl(item.youtube_url!)}
                  style={({ pressed }) => [styles.listenButton, pressed && styles.pressed]}
                >
                  <Ionicons name="play" size={17} color={colors.text} />
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
      )}

      <Text style={styles.notice}>
        송리스트는 예배팀의 준비와 현장 상황에 따라 사전 안내 없이 변경될 수 있습니다.
      </Text>

      {setlist?.playlist_url ? (
        <ActionButton
          label="전체 듣기"
          icon="play-circle-outline"
          primary
          onPress={() => void openExternalUrl(setlist.playlist_url!)}
        />
      ) : null}
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    eventMeta: {
      gap: 3,
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
      paddingBottom: spacing.md
    },
    eventDate: { ...typography.caption, color: colors.muted },
    eventTitle: { ...typography.label, color: colors.text },
    publishRow: {
      marginTop: spacing.xxs,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm
    },
    publishMeta: { ...typography.caption, color: colors.muted },
    changedBadge: {
      borderRadius: radii.sm,
      paddingHorizontal: spacing.xs,
      paddingVertical: 4,
      backgroundColor: colors.cta,
      borderWidth: 1,
      borderColor: colors.ctaBorder
    },
    changedText: { ...typography.caption, color: colors.onCta },
    songList: { borderBottomWidth: 1, borderBottomColor: colors.line },
    songRow: {
      minHeight: 72,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingVertical: spacing.xs
    },
    songDivider: { borderTopWidth: 1, borderTopColor: colors.line },
    position: { ...typography.label, color: colors.active, width: 30 },
    songCopy: { flex: 1, gap: 3 },
    songTitle: { ...typography.label, color: colors.text },
    songMeta: { ...typography.caption, color: colors.muted },
    listenButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.controlBorder
    },
    notice: {
      ...typography.caption,
      color: colors.muted,
      textAlign: "center",
      marginTop: "auto",
      paddingVertical: spacing.xl
    },
    pressed: { opacity: 0.68 }
  });
}

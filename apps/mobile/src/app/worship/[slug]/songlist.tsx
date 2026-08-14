import { AppHeader } from "@/components/app-header";
import { Screen } from "@/components/screen";
import { ActionButton, Card, EmptyState, ErrorState, LoadingState } from "@/components/ui";
import { useContent } from "@/features/content/content-provider";
import { formatEventDate, selectSetlistForEvent } from "@/features/content/selectors";
import { openExternalUrl } from "@/features/links/open-external-url";
import { colors, radii, spacing, typography } from "@/theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { Alert, Pressable, Share, StyleSheet, Text, View } from "react-native";

export default function SonglistScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { content, error, loading, refresh } = useContent();
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
          event ? `jubileeworship://worship/${event.slug}/songlist` : null
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
        <AppHeader title="워십 송리스트" back />
        <EmptyState title="예배를 찾을 수 없습니다" description="공개 상태가 변경됐거나 잘못된 링크입니다." />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader eyebrow="This Week" title="워십 송리스트" back />
      <Card>
        <View style={styles.eventHeader}>
          <View style={styles.musicIcon}>
            <Ionicons name="musical-notes" size={23} color={colors.active} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <Text style={styles.eventDate}>{formatEventDate(event.starts_at)}</Text>
          </View>
          {setlist?.is_changed ? (
            <View style={styles.changedPill}><Text style={styles.changedText}>변경</Text></View>
          ) : null}
        </View>
      </Card>

      {!setlist || setlist.items.length === 0 ? (
        <EmptyState
          title="이번 주 송리스트를 준비하고 있습니다"
          description="관리자가 확인하고 공개한 곡만 이곳에 표시됩니다."
        />
      ) : (
        <Card>
          <Text style={styles.publishMeta}>
            {new Intl.DateTimeFormat("ko-KR", {
              timeZone: "Asia/Seoul",
              month: "long",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit"
            }).format(new Date(setlist.published_at))} 공개
          </Text>
          {setlist.items.map((item, index) => (
            <View key={item.id} style={[styles.songRow, index > 0 && styles.songDivider]}>
              <View style={styles.position}><Text style={styles.positionText}>{item.position}</Text></View>
              <View style={styles.songCopy}>
                <Text style={styles.songTitle}>{item.title}</Text>
                {item.artist ? <Text style={styles.artist}>{item.artist}</Text> : null}
              </View>
              {item.musical_key ? (
                <View style={styles.keyPill} accessibilityLabel={`KEY ${item.musical_key}`}>
                  <Text style={styles.keyText}>KEY {item.musical_key}</Text>
                </View>
              ) : null}
              {item.youtube_url ? (
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={`${item.title} YouTube에서 듣기`}
                  onPress={() => void openExternalUrl(item.youtube_url!)}
                  style={({ pressed }) => [styles.listenButton, pressed && styles.pressed]}
                >
                  <Ionicons name="play" size={17} color={colors.active} />
                </Pressable>
              ) : null}
            </View>
          ))}
          {setlist.is_changed ? (
            <Text style={styles.changeNotice}>현장 사정에 따라 곡 순서가 변경될 수 있습니다.</Text>
          ) : null}
        </Card>
      )}

      {setlist?.playlist_url ? (
        <ActionButton label="전체 듣기" icon="play-circle-outline" primary onPress={() => void openExternalUrl(setlist.playlist_url!)} />
      ) : null}
      <ActionButton
        label="송리스트 공유"
        icon="share-outline"
        onPress={() => void shareSonglist()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  eventHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  musicIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.activeSoft
  },
  headerCopy: { flex: 1, gap: 3 },
  eventTitle: { ...typography.label, color: colors.text },
  eventDate: { ...typography.caption, color: colors.muted },
  changedPill: { paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radii.pill, backgroundColor: colors.cta },
  changedText: { ...typography.caption, color: colors.text },
  songRow: { minHeight: 68, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  songDivider: { borderTopWidth: 1, borderTopColor: colors.line },
  position: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: colors.activeSoft },
  positionText: { ...typography.label, color: colors.active },
  songCopy: { flex: 1, gap: 2 },
  songTitle: { ...typography.label, color: colors.text },
  artist: { ...typography.caption, color: colors.muted },
  publishMeta: { ...typography.caption, color: colors.muted },
  changeNotice: {
    ...typography.caption,
    color: colors.muted,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: spacing.sm,
    marginTop: spacing.xs
  },
  keyPill: {
    borderRadius: radii.pill,
    backgroundColor: colors.activeSoft,
    paddingHorizontal: 9,
    paddingVertical: 6
  },
  keyText: { ...typography.caption, color: colors.active },
  listenButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: colors.raised, borderWidth: 1, borderColor: colors.controlBorder },
  pressed: { opacity: 0.68 }
});

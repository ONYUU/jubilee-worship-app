import {
  addEventToCalendar,
  openMapChoices,
  shareEvent
} from "@/features/events/actions";
import { resolveMediaSource } from "@/features/content/media-source";
import { formatDday, formatEventDate } from "@/features/content/selectors";
import { openExternalUrl } from "@/features/links/open-external-url";
import { colors, radii, shadows, spacing, typography } from "@/theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import type { MobilePublicEvent, MobilePublicSetlist } from "@jubilee/domain";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ActionButton } from "./ui";

const statusLabel: Record<MobilePublicEvent["status"], string> = {
  scheduled: "예정",
  postponed: "변경",
  cancelled: "취소",
  completed: "완료"
};

type Props = {
  event: MobilePublicEvent;
  setlist: MobilePublicSetlist | null;
  naverMapUrl: string;
  kakaoMapUrl: string;
  showShare?: boolean;
  variant?: "hero" | "summary";
};

export function EventCard({
  event,
  setlist,
  naverMapUrl,
  kakaoMapUrl,
  showShare = false,
  variant = "hero"
}: Props) {
  const router = useRouter();
  const image = resolveMediaSource(event.hero_media_path);
  const cancelled = event.status === "cancelled";

  return (
    <View style={styles.card}>
      {variant === "hero" ? <View style={styles.hero}>
        {image ? (
          <Image
            source={image}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
            accessibilityLabel="예배 중 함께 찬양하는 쥬빌리워십 공동체"
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.imageFallback]} />
        )}
        <LinearGradient
          colors={["rgba(13,28,42,0.04)", "rgba(13,28,42,0.24)", "rgba(13,28,42,0.88)"]}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.heroTop}>
          <View style={[styles.statusPill, cancelled && styles.cancelledPill]}>
            <Text style={[styles.statusText, cancelled && styles.cancelledText]}>
              {statusLabel[event.status]}
            </Text>
          </View>
          <View style={styles.ddayPill}>
            <Text style={styles.ddayText}>{formatDday(event.starts_at)}</Text>
          </View>
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          <Text style={styles.eventDate}>{formatEventDate(event.starts_at)}</Text>
          <Text style={styles.eventVenue}>{event.venue_name}</Text>
        </View>
      </View> : null}

      <View style={styles.body}>
        {variant === "summary" ? (
          <View style={styles.summaryHeader}>
            <View style={styles.summaryPills}>
              <View style={[styles.statusPill, cancelled && styles.cancelledPill]}>
                <Text style={[styles.statusText, cancelled && styles.cancelledText]}>
                  {statusLabel[event.status]}
                </Text>
              </View>
              <View style={styles.summaryDdayPill}>
                <Text style={styles.ddayText}>{formatDday(event.starts_at)}</Text>
              </View>
            </View>
            <Text style={styles.summaryTitle}>{event.title}</Text>
            <Text style={styles.summaryDate}>{formatEventDate(event.starts_at)}</Text>
            <Text style={styles.summaryVenue}>{event.venue_name}</Text>
          </View>
        ) : null}

        {variant === "hero" ? <View style={styles.detailBlock}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>주소</Text>
            <Text style={styles.detailValue}>{event.address}</Text>
          </View>
          {event.description ? <Text style={styles.description}>{event.description}</Text> : null}
        </View> : null}

        {!cancelled ? (
          <View style={styles.sermon}>
            <Text style={styles.sermonEyebrow}>이번 예배 말씀</Text>
            {event.sermon_topic && event.scripture_reference ? (
              <>
                <Text style={styles.sermonTitle}>{event.sermon_topic}</Text>
                <Text style={styles.sermonVerse}>본문 · {event.scripture_reference}</Text>
              </>
            ) : (
              <Text style={styles.preparing}>설교 주제와 말씀 구절을 준비하고 있습니다</Text>
            )}
          </View>
        ) : null}

        {variant === "hero" ? <Pressable
          accessibilityRole="button"
          accessibilityLabel="이번 주 워십 송리스트 전체 보기"
          onPress={() =>
            router.push({
              pathname: "/worship/[slug]/songlist",
              params: { slug: event.slug }
            })
          }
          style={({ pressed }) => [styles.songlist, pressed && styles.pressed]}
        >
          <View style={styles.songIcon}>
            <Ionicons name="musical-notes" size={18} color={colors.active} />
          </View>
          <View style={styles.songCopy}>
            <Text style={styles.songEyebrow}>이번 주 워십 송리스트</Text>
            {setlist && setlist.items.length > 0 ? (
              <Text style={styles.songSummary} numberOfLines={1}>
                {setlist.items
                  .slice(0, 3)
                  .map((item) => item.title)
                  .join(" · ")}
              </Text>
            ) : (
              <Text style={styles.songSummary}>송리스트를 준비하고 있습니다</Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={19} color={colors.muted} />
        </Pressable> : null}

        <View style={styles.buttonRow}>
          <View style={styles.buttonCell}>
            <ActionButton
              label="캘린더"
              icon="calendar-outline"
              disabled={cancelled}
              onPress={() => void addEventToCalendar(event)}
            />
          </View>
          <View style={styles.buttonCell}>
            <ActionButton
              label="길찾기"
              icon="navigate-outline"
              onPress={() => openMapChoices(event, naverMapUrl, kakaoMapUrl)}
            />
          </View>
        </View>
        {showShare ? (
          <ActionButton
            label="예배 일정 공유"
            icon="share-outline"
            primary
            onPress={() => void shareEvent(event)}
          />
        ) : null}
        {event.registration_url && !cancelled ? (
          <ActionButton
            label="신청·자세히 보기"
            icon="open-outline"
            onPress={() => void openExternalUrl(event.registration_url!)}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    overflow: "hidden",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.card
  },
  hero: { height: 224, justifyContent: "space-between" },
  imageFallback: { backgroundColor: colors.secondarySurface },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.sm
  },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.successSoft
  },
  cancelledPill: { backgroundColor: colors.dangerSoft },
  statusText: { ...typography.caption, color: colors.success },
  cancelledText: { color: colors.danger },
  ddayPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: "rgba(255,255,255,0.92)"
  },
  ddayText: { ...typography.caption, color: colors.text },
  heroCopy: { padding: spacing.md, gap: 3 },
  eventTitle: { ...typography.heading, color: colors.white },
  eventDate: { ...typography.body, color: colors.white },
  eventVenue: { ...typography.caption, color: "rgba(255,255,255,0.78)" },
  body: { padding: spacing.md, gap: spacing.md },
  summaryHeader: { gap: spacing.xs },
  summaryPills: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  summaryDdayPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.activeSoft
  },
  summaryTitle: { ...typography.title, color: colors.text, marginTop: spacing.xs },
  summaryDate: { ...typography.body, color: colors.text },
  summaryVenue: { ...typography.body, color: colors.muted },
  detailBlock: { gap: spacing.xs },
  detailRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  detailLabel: { ...typography.label, color: colors.active, width: 34 },
  detailValue: { ...typography.body, color: colors.muted, flex: 1 },
  description: { ...typography.body, color: colors.muted },
  sermon: { borderLeftWidth: 3, borderLeftColor: colors.active, paddingLeft: spacing.sm, gap: 3 },
  sermonEyebrow: {
    ...typography.caption,
    color: colors.active,
    letterSpacing: 0.5
  },
  sermonTitle: { ...typography.heading, color: colors.text },
  sermonVerse: { ...typography.caption, color: colors.muted },
  preparing: { ...typography.body, color: colors.muted },
  songlist: {
    minHeight: 66,
    borderRadius: radii.md,
    padding: spacing.sm,
    backgroundColor: colors.raised,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  songIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.activeSoft
  },
  songCopy: { flex: 1, gap: 2 },
  songEyebrow: { ...typography.label, color: colors.text },
  songSummary: { ...typography.caption, color: colors.muted },
  buttonRow: { flexDirection: "row", gap: spacing.xs },
  buttonCell: { flex: 1 },
  pressed: { opacity: 0.68 }
});

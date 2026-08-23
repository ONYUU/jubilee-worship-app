import { resolveMediaSource } from "@/features/content/media-source";
import { formatDday, formatEventDate } from "@/features/content/selectors";
import { addEventToCalendar, openMapChoices, shareEvent } from "@/features/events/actions";
import { openExternalUrl } from "@/features/links/open-external-url";
import { useAppThemeStyles } from "@/theme/theme-provider";
import { actionItemStyle, wrappingRowStyle } from "@/theme/responsive-layout";
import { radii, spacing, typography, type ThemeColors } from "@/theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import type { MobilePublicEvent, MobilePublicSetlist } from "@jubilee/domain";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ActionButton } from "./ui";

const statusLabel: Record<MobilePublicEvent["status"], string> = {
  scheduled: "다가오는 예배",
  postponed: "일정 변경",
  cancelled: "취소",
  completed: "지난 예배"
};

type Props = {
  event: MobilePublicEvent;
  setlist: MobilePublicSetlist | null;
  naverMapUrl: string;
  kakaoMapUrl: string;
  showShare?: boolean;
};

export function EventCard({
  event,
  setlist,
  naverMapUrl,
  kakaoMapUrl,
  showShare = false
}: Props) {
  const router = useRouter();
  const { colors, styles } = useAppThemeStyles(createStyles);
  const image = resolveMediaSource(event.hero_media_path);
  const cancelled = event.status === "cancelled";

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        {image ? (
          <Image
            source={image}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
            accessibilityLabel={`${event.title} 예배 사진`}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.imageFallback]} />
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, cancelled && styles.cancelledBadge]}>
            <Text style={[styles.statusText, cancelled && styles.cancelledText]}>
              {statusLabel[event.status]}
            </Text>
          </View>
          <Text style={styles.dday}>{formatDday(event.starts_at)}</Text>
        </View>

        <Text accessibilityRole="header" style={styles.title}>{event.title}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={18} color={colors.text} />
          <Text style={styles.metaText}>{formatEventDate(event.starts_at)}</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={18} color={colors.text} />
          <View style={styles.locationCopy}>
            <Text style={styles.metaText}>{event.venue_name}</Text>
            <Text style={styles.address}>{event.address}</Text>
          </View>
        </View>
        {event.description ? <Text style={styles.description}>{event.description}</Text> : null}

        {!cancelled ? (
          <View style={styles.sermon}>
            <Text style={styles.sectionLabel}>이번 예배 말씀</Text>
            {event.sermon_topic || event.scripture_reference ? (
              <>
                {event.sermon_topic ? <Text style={styles.sermonTitle}>{event.sermon_topic}</Text> : null}
                {event.scripture_reference ? (
                  <Text style={styles.sermonVerse}>본문 · {event.scripture_reference}</Text>
                ) : null}
              </>
            ) : (
              <Text style={styles.preparing}>설교 주제와 말씀 구절을 준비하고 있습니다</Text>
            )}
          </View>
        ) : null}

        {!cancelled ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="이번 주 워십 송리스트 전체 보기"
            onPress={() =>
              router.push({
                pathname: "/worship/[slug]/songlist",
                params: { slug: event.slug }
              })
            }
            style={({ pressed }) => [styles.songlistRow, pressed && styles.rowPressed]}
          >
            <View style={styles.songlistCopy}>
              <Text style={styles.sectionLabel}>이번 주 송리스트</Text>
              <Text style={styles.songSummary} numberOfLines={1}>
                {setlist && setlist.items.length > 0
                  ? `${setlist.items.length}곡 · ${setlist.items.slice(0, 2).map((item) => item.title).join(" · ")}`
                  : "송리스트를 준비하고 있습니다"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </Pressable>
        ) : null}

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
            onPress={() => void shareEvent(event)}
          />
        ) : null}
        {event.registration_url && !cancelled ? (
          <ActionButton
            label="신청·자세히 보기"
            icon="open-outline"
            primary
            onPress={() => void openExternalUrl(event.registration_url!)}
          />
        ) : null}
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      marginHorizontal: -spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
      backgroundColor: colors.background
    },
    hero: { width: "100%", aspectRatio: 16 / 9, backgroundColor: colors.secondarySurface },
    imageFallback: { backgroundColor: colors.secondarySurface },
    body: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm },
    statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    statusBadge: {
      borderRadius: radii.sm,
      paddingHorizontal: spacing.xs,
      paddingVertical: 5,
      backgroundColor: colors.cta,
      borderWidth: 1,
      borderColor: colors.ctaBorder
    },
    cancelledBadge: { backgroundColor: colors.dangerSoft, borderColor: colors.danger },
    statusText: { ...typography.caption, color: colors.onCta },
    cancelledText: { color: colors.danger },
    dday: { ...typography.caption, color: colors.active },
    title: { ...typography.title, fontSize: 22, lineHeight: 29, color: colors.text },
    metaRow: { minHeight: 28, flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
    locationCopy: { flex: 1, gap: 2 },
    metaText: { ...typography.body, color: colors.text, flex: 1 },
    address: { ...typography.caption, color: colors.muted },
    description: { ...typography.body, color: colors.muted },
    sermon: {
      gap: 3,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: colors.line,
      paddingVertical: spacing.sm
    },
    sectionLabel: { ...typography.label, color: colors.text },
    sermonTitle: { ...typography.heading, color: colors.text },
    sermonVerse: { ...typography.caption, color: colors.muted },
    preparing: { ...typography.body, color: colors.muted },
    songlistRow: {
      minHeight: 64,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.xs,
      marginHorizontal: -spacing.xs,
      borderRadius: radii.sm
    },
    songlistCopy: { flex: 1, gap: 3 },
    songSummary: { ...typography.caption, color: colors.muted },
    rowPressed: { backgroundColor: colors.raised },
    buttonRow: { ...wrappingRowStyle, gap: spacing.xs },
    buttonCell: actionItemStyle
  });
}

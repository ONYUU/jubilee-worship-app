import { AppHeader } from "@/components/app-header";
import { Screen } from "@/components/screen";
import { Card, EmptyState, ErrorState, LoadingState, SectionHeading } from "@/components/ui";
import { useContent } from "@/features/content/content-provider";
import {
  loadReceivedNotificationHistory,
  subscribeReceivedNotificationHistory
} from "@/features/notifications/notification-history";
import type { ReceivedNotificationHistoryItem } from "@/features/notifications/notification-history-data";
import { useAppThemeStyles } from "@/theme/theme-provider";
import { radii, spacing, typography, type ThemeColors } from "@/theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

const READ_KEY = "jubilee.notifications.read.v1";

const iconByKind = {
  normal: "notifications-outline",
  important: "megaphone-outline",
  schedule_change: "calendar-outline",
  cancellation: "alert-circle-outline"
} as const;

function formatReceivedAt(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export default function NotificationsScreen() {
  const { content, error, loading, refresh } = useContent();
  const router = useRouter();
  const { colors, styles } = useAppThemeStyles(createStyles);
  const [readIds, setReadIds] = useState<Set<number>>(() => new Set());
  const [received, setReceived] = useState<ReceivedNotificationHistoryItem[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void AsyncStorage.getItem(READ_KEY)
        .then((raw) => {
          if (!raw) return;
          const parsed: unknown = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.every((value) => Number.isSafeInteger(value))) {
            setReadIds(new Set((parsed as number[]).slice(-200)));
          }
        })
        .catch(() => undefined);
    }, 0);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeReceivedNotificationHistory((items) => {
      if (active) setReceived(items);
    });
    void loadReceivedNotificationHistory()
      .then((items) => {
        if (active) setReceived(items);
      })
      .finally(() => {
        if (active) setHistoryLoaded(true);
      });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  function openNotice(id: number, eventId: number | null) {
    setReadIds((current) => {
      const next = new Set([...current, id].slice(-200));
      void AsyncStorage.setItem(READ_KEY, JSON.stringify([...next])).catch(() => undefined);
      return next;
    });
    const event = content?.events.find((candidate) => candidate.id === eventId);
    if (event) {
      router.push({ pathname: "/worship/[slug]", params: { slug: event.slug } });
    }
  }

  async function openReceivedNotification(url: string | null) {
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("알림 화면을 열 수 없습니다", "앱을 다시 연 뒤 시도해 주세요.");
    }
  }

  if (loading && !content && !historyLoaded) return <Screen><LoadingState /></Screen>;

  const announcements = content?.announcements ?? [];
  const hasNotifications = received.length > 0 || announcements.length > 0;

  return (
    <Screen>
      <AppHeader eyebrow="Notice" title="알림함" back />
      {!hasNotifications ? (
        <EmptyState title="새 알림이 없습니다" description="예배 일정과 송리스트 변경 소식이 이곳에 표시됩니다." />
      ) : null}

      {received.length > 0 ? (
        <>
          <SectionHeading title="앱에서 확인한 알림" />
          {received.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole={item.url ? "button" : undefined}
              accessibilityLabel={[
                item.title,
                item.body,
                formatReceivedAt(item.receivedAt)
              ].filter(Boolean).join(", ")}
              disabled={!item.url}
              onPress={() => void openReceivedNotification(item.url)}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Card>
                <View style={styles.noticeRow}>
                  <View style={styles.icon}>
                    <Ionicons name="notifications-outline" size={20} color={colors.active} />
                  </View>
                  <View style={styles.copy}>
                    <Text style={styles.title}>{item.title}</Text>
                    {item.body ? <Text style={styles.body}>{item.body}</Text> : null}
                    <Text style={styles.receivedAt}>{formatReceivedAt(item.receivedAt)}</Text>
                  </View>
                  {item.url ? (
                    <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                  ) : null}
                </View>
              </Card>
            </Pressable>
          ))}
        </>
      ) : null}

      {announcements.length > 0 ? (
        <>
          <SectionHeading title="공식 공지" />
          {announcements.map((notice) => (
          <Pressable
            key={notice.id}
            accessibilityRole="button"
            accessibilityLabel={`${readIds.has(notice.id) ? "읽음" : "읽지 않음"} 알림, ${notice.title}, ${notice.body}`}
            onPress={() => openNotice(notice.id, notice.event_id)}
            style={({ pressed }) => pressed && styles.pressed}
          >
          <Card>
            <View style={styles.noticeRow}>
              <View style={[styles.icon, notice.kind === "cancellation" && styles.dangerIcon]}>
                <Ionicons
                  name={iconByKind[notice.kind]}
                  size={20}
                  color={notice.kind === "cancellation" ? colors.danger : colors.active}
                />
              </View>
              <View style={styles.copy}>
                <View style={styles.titleRow}>
                  {!readIds.has(notice.id) ? <View style={styles.unreadDot} /> : null}
                  <Text style={styles.title}>{notice.title}</Text>
                </View>
                <Text style={styles.body}>{notice.body}</Text>
              </View>
            </View>
          </Card>
          </Pressable>
          ))}
        </>
      ) : null}

      {error && !content ? (
        <ErrorState message={error} retry={() => void refresh()} />
      ) : null}
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  noticeRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  icon: { width: 40, height: 40, borderRadius: radii.pill, alignItems: "center", justifyContent: "center", backgroundColor: colors.activeSoft },
  dangerIcon: { backgroundColor: colors.dangerSoft },
  copy: { flex: 1, gap: 4 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.active },
  title: { ...typography.label, color: colors.text, flexShrink: 1 },
  body: { ...typography.body, color: colors.muted },
  receivedAt: { ...typography.caption, color: colors.muted, marginTop: spacing.xxs },
  pressed: { opacity: 0.68 }
  });
}

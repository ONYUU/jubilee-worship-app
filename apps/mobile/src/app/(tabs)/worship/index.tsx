import { AppHeader } from "@/components/app-header";
import { EventCard } from "@/components/event-card";
import { Screen } from "@/components/screen";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui";
import { useContent } from "@/features/content/content-provider";
import { partitionMobileEvents, selectSetlistForEvent } from "@/features/content/selectors";
import { useAppThemeStyles } from "@/theme/theme-provider";
import { spacing, typography, type ThemeColors } from "@/theme/tokens";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function WorshipScreen() {
  const { content, error, loading, refresh } = useContent();
  const [mode, setMode] = useState<"upcoming" | "past">("upcoming");
  const { styles } = useAppThemeStyles(createStyles);

  if (loading && !content) return <Screen><LoadingState /></Screen>;
  if (error && !content) return <Screen><ErrorState message={error} retry={() => void refresh()} /></Screen>;
  if (!content) return null;

  const eventsByTime = partitionMobileEvents(content.events);
  const events = mode === "past"
    ? [...eventsByTime.past].sort(
        (left, right) => Date.parse(right.starts_at) - Date.parse(left.starts_at)
      )
    : eventsByTime.upcoming;

  return (
    <Screen>
      <AppHeader title={content.site.name_ko} notifications />
      <View accessibilityRole="tablist" style={styles.segmented}>
        {(["upcoming", "past"] as const).map((value) => {
          const selected = mode === value;
          return (
            <Pressable
              key={value}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setMode(value)}
              style={[styles.segment, selected && styles.selectedSegment]}
            >
              <Text style={[styles.segmentText, selected && styles.selectedText]}>
                {value === "upcoming" ? "다가오는 예배" : "지난 예배"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {events.length === 0 ? (
        <EmptyState
          title={mode === "upcoming" ? "예배 일정을 준비하고 있습니다" : "지난 예배가 없습니다"}
          description="관리자가 공개한 일정만 표시됩니다."
        />
      ) : (
        events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            setlist={selectSetlistForEvent(content.setlists, event.id)}
            naverMapUrl={content.site.naver_map_url}
            kakaoMapUrl={content.site.kakao_map_url}
            showShare
          />
        ))
      )}
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  segmented: {
    flexDirection: "row",
    marginHorizontal: -spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line
  },
  segment: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: "transparent"
  },
  selectedSegment: { borderBottomColor: colors.active },
  segmentText: { ...typography.label, color: colors.muted },
  selectedText: { color: colors.active }
  });
}

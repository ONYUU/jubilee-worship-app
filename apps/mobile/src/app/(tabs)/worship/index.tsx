import { AppHeader } from "@/components/app-header";
import { EventCard } from "@/components/event-card";
import { Screen } from "@/components/screen";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui";
import { useContent } from "@/features/content/content-provider";
import { partitionMobileEvents, selectSetlistForEvent } from "@/features/content/selectors";
import { colors, radii, spacing, typography } from "@/theme/tokens";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function WorshipScreen() {
  const { content, error, loading, refresh } = useContent();
  const [mode, setMode] = useState<"upcoming" | "past">("upcoming");

  if (loading && !content) return <Screen><LoadingState /></Screen>;
  if (error && !content) return <Screen><ErrorState message={error} retry={() => void refresh()} /></Screen>;
  if (!content) return null;

  const eventsByTime = partitionMobileEvents(content.events);
  const events = eventsByTime[mode];

  return (
    <Screen>
      <AppHeader eyebrow="Worship" title="예배" notifications />
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

const styles = StyleSheet.create({
  segmented: {
    flexDirection: "row",
    backgroundColor: colors.secondarySurface,
    borderRadius: radii.pill,
    padding: 4,
    gap: 4
  },
  segment: {
    flex: 1,
    minHeight: 44,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm
  },
  selectedSegment: { backgroundColor: colors.card },
  segmentText: { ...typography.label, color: colors.muted },
  selectedText: { color: colors.text }
});

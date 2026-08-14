import { useContent } from "@/features/content/content-provider";
import { getLastUpdatedLabel } from "@/features/content/selectors";
import { colors, radii, spacing, typography } from "@/theme/tokens";
import type { PropsWithChildren } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function Screen({ children }: PropsWithChildren) {
  const { content, isOffline, usingCache, refreshing, refresh } = useContent();
  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={colors.active}
          />
        }
      >
        {usingCache || isOffline ? (
          <View accessibilityRole="alert" style={styles.offlineBanner}>
            <Text style={styles.offlineText}>
              {isOffline ? "오프라인 저장본을 표시합니다" : "저장된 콘텐츠를 먼저 표시합니다"}
              {content ? ` · ${getLastUpdatedLabel(content)} 업데이트` : ""}
            </Text>
          </View>
        ) : null}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingBottom: 120,
    gap: spacing.md
  },
  offlineBanner: {
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.cta,
    borderWidth: 1,
    borderColor: colors.ctaBorder
  },
  offlineText: { ...typography.caption, color: colors.text, textAlign: "center" }
});

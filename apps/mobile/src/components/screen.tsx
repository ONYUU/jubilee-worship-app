import { useContent } from "@/features/content/content-provider";
import { getLastUpdatedLabel } from "@/features/content/selectors";
import { useAppThemeStyles } from "@/theme/theme-provider";
import { radii, spacing, typography, type ThemeColors } from "@/theme/tokens";
import { Fragment, type PropsWithChildren } from "react";
import { Platform, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function Screen({ children }: PropsWithChildren) {
  const { content, isOffline, usingCache, refreshing, refresh } = useContent();
  const { colors, styles } = useAppThemeStyles(createStyles);
  const { fontScale } = useWindowDimensions();
  // RN 0.86 iOS Fabric can retain stale text measurements after a runtime
  // Dynamic Type change. Remount only screen content so navigation, local
  // screen state and the ScrollView remain intact while Text is remeasured.
  const textLayoutKey = Platform.OS === "ios" ? `font-${fontScale.toFixed(3)}` : "font-stable";
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
        <Fragment key={textLayoutKey}>
          {usingCache || isOffline ? (
            <View accessibilityRole="alert" style={styles.offlineBanner}>
              <Text style={styles.offlineText}>
                {isOffline ? "오프라인 저장본을 표시합니다" : "저장된 콘텐츠를 먼저 표시합니다"}
                {content ? ` · ${getLastUpdatedLabel(content)} 업데이트` : ""}
              </Text>
            </View>
          ) : null}
          {children}
        </Fragment>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
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
  offlineText: { ...typography.caption, color: colors.onCta, textAlign: "center" }
  });
}

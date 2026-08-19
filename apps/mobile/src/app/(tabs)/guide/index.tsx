import { AppContactCard } from "@/components/app-contact-card";
import { AppHeader } from "@/components/app-header";
import { Screen } from "@/components/screen";
import { ActionButton, ErrorState, LoadingState, SectionHeading } from "@/components/ui";
import { useContent } from "@/features/content/content-provider";
import { resolveMediaSource } from "@/features/content/media-source";
import { openExternalUrl } from "@/features/links/open-external-url";
import { useAppThemeStyles } from "@/theme/theme-provider";
import { radii, spacing, typography, type ThemeColors, type ThemeMode } from "@/theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { useState } from "react";
import { AccessibilityInfo, Alert, Pressable, StyleSheet, Text, View } from "react-native";

const themeOptions: { mode: ThemeMode; label: string; icon: "sunny-outline" | "moon-outline" }[] = [
  { mode: "light", label: "라이트", icon: "sunny-outline" },
  { mode: "dark", label: "다크", icon: "moon-outline" }
];

export default function GuideScreen() {
  const router = useRouter();
  const { content, error, loading, refresh } = useContent();
  const { colors, mode, setMode, styles } = useAppThemeStyles(createStyles);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  if (loading && !content) return <Screen><LoadingState /></Screen>;
  if (error && !content) return <Screen><ErrorState message={error} retry={() => void refresh()} /></Screen>;
  if (!content) return null;

  const firstVisit = content.guide.find((section) => section.kind === "first_visit") ?? null;
  const transportGuides = content.guide.filter((section) => section.kind !== "first_visit");

  async function copyAddress() {
    try {
      await Clipboard.setStringAsync(content!.site.address);
      const message = "주소가 복사되었습니다";
      setCopyFeedback(message);
      AccessibilityInfo.announceForAccessibility(message);
    } catch {
      const message = "주소를 복사하지 못했습니다";
      setCopyFeedback(message);
      AccessibilityInfo.announceForAccessibility(message);
      Alert.alert(message, "잠시 후 다시 시도해 주세요.");
    }
  }

  return (
    <Screen>
      <AppHeader title="안내" notifications />

      <View style={styles.hero}>
        <Image
          source={resolveMediaSource(content.site.visit_media_path)}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          accessibilityLabel={content.site.visit_media_alt ?? "쥬빌리워십 공동체 안내 사진"}
        />
        <LinearGradient
          colors={["rgba(10,18,24,0.02)", "rgba(10,18,24,0.12)", "rgba(10,18,24,0.88)"]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle} numberOfLines={2}>
            {firstVisit?.title ?? content.site.about_title}
          </Text>
          <Text style={styles.heroBody} numberOfLines={2}>
            {firstVisit?.body ?? content.site.about_body}
          </Text>
        </View>
      </View>

      <View style={styles.locationBlock}>
        <View style={styles.locationHeading}>
          <Ionicons name="location-outline" size={21} color={colors.text} />
          <View style={styles.locationCopy}>
            <Text style={styles.place}>{content.site.church_name} 본당</Text>
            <Text style={styles.body}>{content.site.address}</Text>
          </View>
        </View>
        <View style={styles.quickActions}>
          <View style={styles.quickActionCell}>
            <ActionButton
              label="네이버"
              icon="navigate-outline"
              onPress={() => void openExternalUrl(content.site.naver_map_url)}
            />
          </View>
          <View style={styles.quickActionCell}>
            <ActionButton
              label="카카오맵"
              icon="map-outline"
              onPress={() => void openExternalUrl(content.site.kakao_map_url)}
            />
          </View>
          <View style={styles.quickActionCell}>
            <ActionButton
              label="주소 복사"
              icon="copy-outline"
              onPress={() => void copyAddress()}
            />
          </View>
        </View>
        {copyFeedback ? (
          <Text accessibilityRole="alert" style={styles.copyFeedback}>{copyFeedback}</Text>
        ) : null}
      </View>

      {firstVisit ? (
        <View style={styles.aboutBlock}>
          <Text style={styles.rowTitle}>{firstVisit.title}</Text>
          <Text style={styles.body}>{firstVisit.body}</Text>
        </View>
      ) : null}

      {transportGuides.length > 0 ? (
        <View style={styles.guideSection}>
          {transportGuides.map((section, index) => (
            <View key={section.id} style={[styles.guideItem, index > 0 && styles.rowDivider]}>
              <Ionicons
                name={section.kind === "parking" ? "car-outline" : "bus-outline"}
                size={20}
                color={colors.active}
              />
              <View style={styles.guideCopy}>
                <Text style={styles.rowTitle}>{section.title}</Text>
                <Text style={styles.body}>{section.body}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.aboutBlock}>
        <Text style={styles.rowTitle}>{content.site.about_title}</Text>
        <Text style={styles.body}>{content.site.about_body}</Text>
      </View>

      <View style={styles.menu}>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="공식 Instagram 열기"
          onPress={() => void openExternalUrl(content.site.instagram_url)}
          style={({ pressed }) => [styles.menuRow, pressed && styles.rowPressed]}
        >
          <Ionicons name="logo-instagram" size={20} color={colors.text} />
          <Text style={styles.menuTitle}>공식 Instagram</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="공식 YouTube 열기"
          onPress={() => void openExternalUrl(content.site.youtube_channel_url)}
          style={({ pressed }) => [styles.menuRow, styles.rowDivider, pressed && styles.rowPressed]}
        >
          <Ionicons name="logo-youtube" size={20} color={colors.text} />
          <Text style={styles.menuTitle}>공식 YouTube</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="알림 설정 열기"
          onPress={() => router.push("/notification-settings" as Href)}
          style={({ pressed }) => [styles.menuRow, styles.rowDivider, pressed && styles.rowPressed]}
        >
          <Ionicons name="notifications-outline" size={20} color={colors.text} />
          <Text style={styles.menuTitle}>알림 설정</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="개인정보 처리방침 열기"
          onPress={() => router.push("/privacy")}
          style={({ pressed }) => [styles.menuRow, styles.rowDivider, pressed && styles.rowPressed]}
        >
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.text} />
          <Text style={styles.menuTitle}>개인정보 처리방침</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>
      </View>

      <View style={styles.themeSection}>
        <SectionHeading title="화면 모드" />
        <Text style={styles.body}>선택한 설정은 이 기기에 저장됩니다.</Text>
        <View accessibilityRole="radiogroup" style={styles.themeOptions}>
          {themeOptions.map((option) => {
            const selected = mode === option.mode;
            return (
              <Pressable
                key={option.mode}
                accessibilityRole="radio"
                accessibilityLabel={`${option.label} 모드`}
                accessibilityState={{ checked: selected }}
                aria-checked={selected}
                onPress={() => setMode(option.mode)}
                style={({ pressed }) => [
                  styles.themeOption,
                  selected && styles.themeOptionSelected,
                  pressed && styles.rowPressed
                ]}
              >
                <Ionicons
                  name={option.icon}
                  size={21}
                  color={selected ? colors.active : colors.muted}
                />
                <Text style={[styles.themeOptionText, selected && styles.themeOptionTextSelected]}>
                  {option.label}
                </Text>
                <View style={[styles.selectionIndicator, selected && styles.selectionIndicatorSelected]}>
                  {selected ? <View style={styles.selectionDot} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <SectionHeading title="앱·문의" />
      <AppContactCard />
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    hero: {
      height: 210,
      marginHorizontal: -spacing.md,
      justifyContent: "flex-end",
      overflow: "hidden",
      backgroundColor: colors.secondarySurface
    },
    heroCopy: { padding: spacing.md, gap: 3 },
    heroTitle: { ...typography.heading, color: colors.onPhoto },
    heroBody: { ...typography.caption, color: "rgba(255,255,255,0.84)" },
    locationBlock: { gap: spacing.sm },
    locationHeading: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
    locationCopy: { flex: 1, gap: 2 },
    place: { ...typography.heading, color: colors.text },
    body: { ...typography.body, color: colors.muted },
    copyFeedback: { ...typography.caption, color: colors.active, textAlign: "center" },
    quickActions: { flexDirection: "row", gap: spacing.xxs },
    quickActionCell: { flex: 1 },
    guideSection: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line },
    guideItem: {
      minHeight: 68,
      paddingVertical: spacing.sm,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm
    },
    guideCopy: { flex: 1, gap: 3 },
    rowTitle: { ...typography.label, color: colors.text },
    aboutBlock: {
      gap: spacing.xs,
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
      paddingBottom: spacing.md
    },
    menu: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line },
    menuRow: {
      minHeight: 52,
      paddingHorizontal: spacing.xs,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm
    },
    menuTitle: { ...typography.body, color: colors.text, flex: 1 },
    rowDivider: { borderTopWidth: 1, borderTopColor: colors.line },
    rowPressed: { backgroundColor: colors.raised },
    themeSection: { gap: spacing.xs },
    themeOptions: { flexDirection: "row", gap: spacing.xs },
    themeOption: {
      flex: 1,
      minHeight: 52,
      paddingHorizontal: spacing.sm,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: colors.controlBorder,
      backgroundColor: colors.raised,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs
    },
    themeOptionSelected: { borderColor: colors.active, backgroundColor: colors.activeSoft },
    themeOptionText: { ...typography.label, color: colors.muted, flex: 1 },
    themeOptionTextSelected: { color: colors.text },
    selectionIndicator: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 1.5,
      borderColor: colors.controlBorder,
      alignItems: "center",
      justifyContent: "center"
    },
    selectionIndicatorSelected: { borderColor: colors.active },
    selectionDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.active }
  });
}

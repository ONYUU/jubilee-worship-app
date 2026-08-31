import { AppHeader } from "@/components/app-header";
import { Screen } from "@/components/screen";
import { EmptyState, ErrorState, LoadingState, SectionHeading } from "@/components/ui";
import { useContent } from "@/features/content/content-provider";
import { resolveMediaSource } from "@/features/content/media-source";
import { openExternalUrl } from "@/features/links/open-external-url";
import { useAppThemeStyles } from "@/theme/theme-provider";
import { radii, spacing, typography, type ThemeColors } from "@/theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import type { MobilePublicMediaItem } from "@jubilee/domain";
import { Image } from "expo-image";
import { useMemo, useState } from "react";
import { Alert, Pressable, Share, StyleSheet, Text, TextInput, View } from "react-native";

function formatOccurredOn(value: string | null): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "numeric",
    day: "numeric"
  }).format(new Date(`${value}T00:00:00+09:00`));
}

async function shareMedia(item: MobilePublicMediaItem) {
  try {
    await Share.share({ title: item.title, message: `${item.title}\n${item.external_url}` });
  } catch {
    Alert.alert("공유하지 못했습니다", "잠시 후 다시 시도해 주세요.");
  }
}

export default function MediaScreen() {
  const { content, error, loading, refresh } = useContent();
  const [query, setQuery] = useState("");
  const [searchVisible, setSearchVisible] = useState(false);
  const { colors, styles } = useAppThemeStyles(createStyles);
  const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");
  const visibleMedia = useMemo(
    () =>
      content && normalizedQuery
        ? content.media.filter((item) =>
            `${item.title} ${item.description ?? ""}`
              .toLocaleLowerCase("ko-KR")
              .includes(normalizedQuery)
          )
        : (content?.media ?? []),
    [content, normalizedQuery]
  );

  if (loading && !content) return <Screen><LoadingState /></Screen>;
  if (error && !content) return <Screen><ErrorState message={error} retry={() => void refresh()} /></Screen>;
  if (!content) return null;

  const featured = visibleMedia.find((item) => item.featured) ?? visibleMedia[0] ?? null;
  const remainingMedia = featured
    ? visibleMedia.filter((item) => item.id !== featured.id)
    : [];

  function toggleSearch() {
    if (searchVisible) setQuery("");
    setSearchVisible(!searchVisible);
  }

  return (
    <Screen>
      <AppHeader
        title="미디어"
        actionIcon={searchVisible ? "close" : "search"}
        actionLabel={searchVisible ? "영상 검색 닫기" : "영상 검색 열기"}
        onActionPress={toggleSearch}
      />

      {searchVisible ? (
        <View style={styles.searchBox}>
          <Ionicons name="search" size={19} color={colors.muted} />
          <TextInput
            accessibilityLabel="예배 영상 제목 검색"
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder="예배 영상 검색"
            placeholderTextColor={colors.muted}
            returnKeyType="search"
            style={styles.searchInput}
          />
        </View>
      ) : null}

      {!featured ? (
        <EmptyState
          title={normalizedQuery ? "검색 결과가 없습니다" : "공개된 영상이 없습니다"}
          description={
            normalizedQuery
              ? "다른 제목으로 검색해 보세요."
              : "공식 채널 확인을 마친 영상만 표시됩니다."
          }
        />
      ) : (
        <>
          <View style={styles.featuredBlock}>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`${featured.title} YouTube에서 열기`}
              onPress={() => void openExternalUrl(featured.external_url)}
              style={({ pressed }) => [styles.videoHero, pressed && styles.pressed]}
            >
              <Image
                source={resolveMediaSource(featured.thumbnail_path)}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                cachePolicy="memory-disk"
                accessibilityLabel={featured.thumbnail_alt ?? featured.title}
              />
              <View style={styles.playButton}>
                <Ionicons name="play" size={25} color={colors.onLightSurface} />
              </View>
            </Pressable>
            <View style={styles.featuredCopy}>
              <Text style={styles.eyebrow}>최근 예배</Text>
              <Text style={styles.featuredTitle}>{featured.title}</Text>
              <View style={styles.featuredMetaRow}>
                <Text style={styles.meta} numberOfLines={1}>
                  {[formatOccurredOn(featured.occurred_on), featured.source_label]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${featured.title} 공유`}
                  onPress={() => void shareMedia(featured)}
                  style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                >
                  <Ionicons name="share-outline" size={20} color={colors.text} />
                </Pressable>
              </View>
            </View>
          </View>

          {remainingMedia.length > 0 ? (
            <View style={styles.moreMedia}>
              <SectionHeading title="예배 영상" />
              {remainingMedia.map((item, index) => (
                <Pressable
                  key={item.id}
                  accessibilityRole="link"
                  accessibilityLabel={`${item.title} YouTube에서 열기`}
                  onPress={() => void openExternalUrl(item.external_url)}
                  style={({ pressed }) => [
                    styles.mediaRow,
                    index > 0 && styles.rowDivider,
                    pressed && styles.rowPressed
                  ]}
                >
                  <Image
                    source={resolveMediaSource(item.thumbnail_path)}
                    style={styles.mediaThumb}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    accessibilityLabel={item.thumbnail_alt ?? item.title}
                  />
                  <View style={styles.mediaRowCopy}>
                    <Text style={styles.mediaRowTitle} numberOfLines={2}>{item.title}</Text>
                    {item.source_label ? (
                      <Text style={styles.meta} numberOfLines={1}>{item.source_label}</Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                </Pressable>
              ))}
            </View>
          ) : null}
        </>
      )}

      <SectionHeading title="예배 갤러리" />
      {content.gallery.length === 0 ? (
        <EmptyState title="공개된 사진이 없습니다" description="사용 승인을 확인한 사진만 표시됩니다." />
      ) : (
        <View style={styles.gallery}>
          {content.gallery.map((item) => (
            <Image
              key={item.id}
              source={resolveMediaSource(item.thumbnail_path ?? item.media_path)}
              style={styles.galleryImage}
              contentFit="cover"
              cachePolicy="memory-disk"
              accessibilityLabel={item.alt}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    searchBox: {
      minHeight: 48,
      borderRadius: radii.sm,
      paddingHorizontal: spacing.sm,
      backgroundColor: colors.raised,
      borderWidth: 1,
      borderColor: colors.controlBorder,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs
    },
    searchInput: { ...typography.body, color: colors.text, flex: 1, minHeight: 44 },
    featuredBlock: {
      marginHorizontal: -spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.line
    },
    videoHero: {
      width: "100%",
      aspectRatio: 16 / 9,
      backgroundColor: colors.secondarySurface,
      alignItems: "center",
      justifyContent: "center"
    },
    playButton: {
      width: 58,
      height: 58,
      borderRadius: 29,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,245,174,0.95)"
    },
    featuredCopy: { padding: spacing.md, gap: 4 },
    eyebrow: { ...typography.caption, color: colors.active },
    featuredTitle: { ...typography.heading, color: colors.text },
    featuredMetaRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
    meta: { ...typography.caption, color: colors.muted, flex: 1 },
    iconButton: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 22
    },
    moreMedia: { gap: spacing.xs },
    mediaRow: {
      minHeight: 88,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingVertical: spacing.xs
    },
    rowDivider: { borderTopWidth: 1, borderTopColor: colors.line },
    rowPressed: { backgroundColor: colors.raised },
    mediaThumb: { width: 112, height: 70, borderRadius: radii.sm },
    mediaRowCopy: { flex: 1, gap: 4 },
    mediaRowTitle: { ...typography.label, color: colors.text },
    gallery: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
    galleryImage: { width: "48%", aspectRatio: 1.12, borderRadius: radii.sm },
    pressed: { opacity: 0.72 }
  });
}

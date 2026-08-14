import { AppHeader } from "@/components/app-header";
import { Screen } from "@/components/screen";
import { ActionButton, EmptyState, ErrorState, LoadingState, SectionHeading } from "@/components/ui";
import { useContent } from "@/features/content/content-provider";
import { resolveMediaSource } from "@/features/content/media-source";
import { openExternalUrl } from "@/features/links/open-external-url";
import { colors, radii, spacing, typography } from "@/theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useMemo, useState } from "react";
import { Alert, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";

export default function MediaScreen() {
  const { content, error, loading, refresh } = useContent();
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");
  const visibleMedia = useMemo(
    () =>
      content && normalizedQuery
        ? content.media.filter((item) =>
            `${item.title} ${item.description ?? ""}`.toLocaleLowerCase("ko-KR").includes(normalizedQuery)
          )
        : (content?.media ?? []),
    [content, normalizedQuery]
  );

  if (loading && !content) return <Screen><LoadingState /></Screen>;
  if (error && !content) return <Screen><ErrorState message={error} retry={() => void refresh()} /></Screen>;
  if (!content) return null;

  return (
    <Screen>
      <AppHeader eyebrow="Official Media" title="미디어" notifications />
      <TextInput
        accessibilityLabel="예배 영상 제목 검색"
        value={query}
        onChangeText={setQuery}
        placeholder="예배 영상 검색"
        placeholderTextColor={colors.muted}
        returnKeyType="search"
        style={styles.searchInput}
      />
      <SectionHeading title="예배 영상" />
      {visibleMedia.length === 0 ? (
        <EmptyState
          title={normalizedQuery ? "검색 결과가 없습니다" : "공개된 영상이 없습니다"}
          description={normalizedQuery ? "다른 제목으로 검색해 보세요." : "공식 채널 확인을 마친 영상만 표시됩니다."}
        />
      ) : (
        visibleMedia.map((item) => (
          <View key={item.id} style={styles.videoCard}>
            <View>
              <Image
                source={resolveMediaSource(item.thumbnail_path)}
                style={styles.videoImage}
                contentFit="cover"
                cachePolicy="memory-disk"
                accessibilityLabel={item.thumbnail_alt ?? item.title}
              />
              <View style={styles.play}>
                <Ionicons name="play" size={21} color={colors.text} />
              </View>
            </View>
            <View style={styles.videoCopy}>
              <Text style={styles.videoTitle}>{item.title}</Text>
              <Text style={styles.videoMeta}>{item.source_label}</Text>
              <View style={styles.buttonRow}>
                <View style={styles.buttonCell}>
                  <ActionButton
                    label="YouTube"
                    icon="logo-youtube"
                    primary
                    onPress={() => void openExternalUrl(item.external_url)}
                  />
                </View>
                <View style={styles.buttonCell}>
                  <ActionButton
                    label="공유"
                    icon="share-outline"
                    onPress={() =>
                      void Share.share({ title: item.title, message: `${item.title}\n${item.external_url}` })
                        .catch(() => Alert.alert("공유하지 못했습니다", "잠시 후 다시 시도해 주세요."))
                    }
                  />
                </View>
              </View>
            </View>
          </View>
        ))
      )}

      <SectionHeading title="예배 사진" />
      {content.gallery.length === 0 ? (
        <EmptyState title="공개된 사진이 없습니다" description="사용 승인을 확인한 사진만 표시됩니다." />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gallery}>
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
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchInput: {
    minHeight: 48,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.raised,
    borderWidth: 1,
    borderColor: colors.controlBorder,
    ...typography.body,
    color: colors.text
  },
  videoCard: {
    overflow: "hidden",
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line
  },
  videoImage: { width: "100%", aspectRatio: 16 / 9 },
  play: {
    position: "absolute",
    left: "50%",
    top: "50%",
    marginLeft: -24,
    marginTop: -24,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.94)"
  },
  videoCopy: { padding: spacing.md, gap: 4 },
  videoTitle: { ...typography.label, color: colors.text },
  videoMeta: { ...typography.caption, color: colors.muted },
  buttonRow: { flexDirection: "row", gap: spacing.xs, marginTop: spacing.xs },
  buttonCell: { flex: 1 },
  gallery: { gap: spacing.sm, paddingRight: spacing.md },
  galleryImage: { width: 238, height: 170, borderRadius: radii.md }
});

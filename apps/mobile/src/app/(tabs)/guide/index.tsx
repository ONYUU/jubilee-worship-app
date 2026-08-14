import { AppHeader } from "@/components/app-header";
import { Screen } from "@/components/screen";
import { ActionButton, Card, ErrorState, LoadingState, SectionHeading } from "@/components/ui";
import { useContent } from "@/features/content/content-provider";
import { resolveMediaSource } from "@/features/content/media-source";
import { openExternalUrl } from "@/features/links/open-external-url";
import { colors, radii, spacing, typography } from "@/theme/tokens";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { Href } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

const guideIcon = {
  first_visit: "heart-outline",
  parking: "car-outline",
  transit: "bus-outline"
} as const;

export default function GuideScreen() {
  const router = useRouter();
  const { content, error, loading, refresh } = useContent();
  if (loading && !content) return <Screen><LoadingState /></Screen>;
  if (error && !content) return <Screen><ErrorState message={error} retry={() => void refresh()} /></Screen>;
  if (!content) return null;

  return (
    <Screen>
      <AppHeader eyebrow="Welcome" title="안내" notifications />
      <Image
        source={resolveMediaSource("/images/hero/visit-welcome-960x610.webp")}
        style={styles.hero}
        contentFit="cover"
        cachePolicy="memory-disk"
        accessibilityLabel="쥬빌리워십 현장 안내 공간"
      />

      <Card>
        <Text style={styles.cardTitle}>{content.site.about_title}</Text>
        <Text style={styles.body}>{content.site.about_body}</Text>
      </Card>

      {content.guide.length > 0 ? (
        <>
          <SectionHeading title="처음 오셨나요?" />
          {content.guide.map((section) => (
            <Card key={section.id}>
              <View style={styles.guideHeader}>
                <View style={styles.guideIcon}>
                  <Ionicons name={guideIcon[section.kind]} size={20} color={colors.active} />
                </View>
                <Text style={styles.cardTitle}>{section.title}</Text>
              </View>
              <Text style={styles.body}>{section.body}</Text>
            </Card>
          ))}
        </>
      ) : null}

      <SectionHeading title="오시는 길" />
      <Card>
        <Text style={styles.place}>{content.site.church_name} 본당</Text>
        <Text style={styles.body}>{content.site.address}</Text>
        <View style={styles.buttonRow}>
          <View style={styles.buttonCell}>
            <ActionButton label="네이버 지도" icon="navigate-outline" onPress={() => void openExternalUrl(content.site.naver_map_url)} />
          </View>
          <View style={styles.buttonCell}>
            <ActionButton label="카카오맵" icon="map-outline" onPress={() => void openExternalUrl(content.site.kakao_map_url)} />
          </View>
        </View>
      </Card>

      <SectionHeading title="공식 채널" />
      <Card>
        <ActionButton label="Instagram" icon="logo-instagram" onPress={() => void openExternalUrl(content.site.instagram_url)} />
        <ActionButton label="YouTube" icon="logo-youtube" onPress={() => void openExternalUrl(content.site.youtube_channel_url)} />
      </Card>

      <SectionHeading title="알림" />
      <Card>
        <Text style={styles.cardTitle}>예배 소식을 놓치지 않도록</Text>
        <Text style={styles.body}>원하는 예배 소식만 선택하고 언제든 해제할 수 있습니다.</Text>
        <ActionButton
          label="알림 설정"
          icon="notifications-outline"
          onPress={() => router.push("/notification-settings" as Href)}
        />
      </Card>

      <SectionHeading title="법적 안내" />
      <Card>
        <ActionButton
          label="개인정보 처리방침"
          icon="shield-checkmark-outline"
          onPress={() => router.push("/privacy")}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { width: "100%", height: 220, borderRadius: radii.lg },
  cardTitle: { ...typography.heading, color: colors.text },
  place: { ...typography.heading, color: colors.text },
  body: { ...typography.body, color: colors.muted },
  guideHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  guideIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.activeSoft,
    alignItems: "center",
    justifyContent: "center"
  },
  buttonRow: { flexDirection: "row", gap: spacing.xs },
  buttonCell: { flex: 1 }
});

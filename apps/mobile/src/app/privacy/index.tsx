import { AppHeader } from "@/components/app-header";
import { AppContactCard } from "@/components/app-contact-card";
import { Screen } from "@/components/screen";
import { Card, EmptyState, ErrorState, LoadingState } from "@/components/ui";
import { useContent } from "@/features/content/content-provider";
import { APP_INFO } from "@/config/app-info";
import { useAppThemeStyles } from "@/theme/theme-provider";
import { spacing, typography, type ThemeColors } from "@/theme/tokens";
import { StyleSheet, Text } from "react-native";

export default function PrivacyScreen() {
  const { content, error, loading, refresh } = useContent();
  const { styles } = useAppThemeStyles(createStyles);
  if (loading && !content) return <Screen><LoadingState /></Screen>;
  if (error && !content) return <Screen><ErrorState message={error} retry={() => void refresh()} /></Screen>;

  const document = content?.legal.find((item) => item.document_type === "privacy_policy") ?? null;

  return (
    <Screen>
      <AppHeader eyebrow="Privacy" title="개인정보 처리방침" back />
      <AppContactCard />
      {document ? (
        <Card>
          <Text style={styles.title}>{document.title}</Text>
          <Text style={styles.meta}>
            {document.version} · {document.effective_on} 시행
          </Text>
          <Text style={styles.body}>{document.body}</Text>
        </Card>
      ) : (
        <EmptyState
          title="개인정보 처리방침 공개 전입니다"
          description={`정식 처리방침은 공개 준비 중이며, 개인정보 관련 문의는 ${APP_INFO.contactEmail}로 받습니다.`}
        />
      )}
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  title: { ...typography.heading, color: colors.text },
  meta: { ...typography.caption, color: colors.muted },
  body: { ...typography.body, color: colors.text, marginTop: spacing.sm }
  });
}

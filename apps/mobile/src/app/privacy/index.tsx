import { AppHeader } from "@/components/app-header";
import { Screen } from "@/components/screen";
import { Card, EmptyState, ErrorState, LoadingState } from "@/components/ui";
import { useContent } from "@/features/content/content-provider";
import { colors, spacing, typography } from "@/theme/tokens";
import { StyleSheet, Text } from "react-native";

export default function PrivacyScreen() {
  const { content, error, loading, refresh } = useContent();
  if (loading && !content) return <Screen><LoadingState /></Screen>;
  if (error && !content) return <Screen><ErrorState message={error} retry={() => void refresh()} /></Screen>;

  const document = content?.legal.find((item) => item.document_type === "privacy_policy") ?? null;

  return (
    <Screen>
      <AppHeader eyebrow="Privacy" title="개인정보 처리방침" back />
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
          title="개인정보 처리방침을 준비하고 있습니다"
          description="운영 정보가 확정되면 앱에 공개됩니다."
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.heading, color: colors.text },
  meta: { ...typography.caption, color: colors.muted },
  body: { ...typography.body, color: colors.text, marginTop: spacing.sm }
});

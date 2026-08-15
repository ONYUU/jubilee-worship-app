import { APP_INFO } from "@/config/app-info";
import { openContactEmail } from "@/features/links/open-external-url";
import { colors, spacing, typography } from "@/theme/tokens";
import { StyleSheet, Text, View } from "react-native";
import { ActionButton, Card } from "./ui";

export function AppContactCard() {
  return (
    <Card>
      <Text accessibilityRole="header" style={styles.heading}>운영 및 문의</Text>
      <View style={styles.infoRow}>
        <Text style={styles.label}>앱명</Text>
        <Text style={styles.value}>{APP_INFO.appName}</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.label}>운영주체</Text>
        <Text style={styles.value}>{APP_INFO.operatorName}</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.label}>문의</Text>
        <Text
          accessibilityLabel={`문의 이메일 ${APP_INFO.contactEmail}`}
          selectable
          style={styles.value}
        >
          {APP_INFO.contactEmail}
        </Text>
      </View>
      <ActionButton
        label="이메일 문의"
        icon="mail-outline"
        onPress={() => void openContactEmail(APP_INFO.contactEmail)}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  heading: { ...typography.heading, color: colors.text },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  label: { ...typography.label, color: colors.muted, width: 64 },
  value: { ...typography.body, color: colors.text, flex: 1 }
});

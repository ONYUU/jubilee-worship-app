import { APP_INFO } from "@/config/app-info";
import { openContactEmail } from "@/features/links/open-external-url";
import { useAppThemeStyles } from "@/theme/theme-provider";
import { spacing, typography, type ThemeColors } from "@/theme/tokens";
import Constants from "expo-constants";
import { StyleSheet, Text, View } from "react-native";
import { ActionButton, Card } from "./ui";

export function AppContactCard() {
  const { styles } = useAppThemeStyles(createStyles);
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
        <Text style={styles.label}>앱 버전</Text>
        <Text selectable style={styles.value}>
          {Constants.expoConfig?.version ?? "확인 불가"}
        </Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.label}>문의</Text>
        <Text
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

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  heading: { ...typography.heading, color: colors.text },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  label: { ...typography.label, color: colors.muted, width: 64 },
  value: { ...typography.body, color: colors.text, flex: 1 }
  });
}

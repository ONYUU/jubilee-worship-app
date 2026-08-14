import { colors, radii, shadows, spacing, typography } from "@/theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, PropsWithChildren, ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

export function Card({ children }: PropsWithChildren) {
  return <View style={styles.card}>{children}</View>;
}

export function SectionHeading({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionHeading}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>
      {action}
    </View>
  );
}

type ButtonProps = {
  label: string;
  icon?: ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
};

export function ActionButton({ label, icon, onPress, primary = false, disabled = false }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        primary ? styles.primaryButton : styles.secondaryButton,
        pressed && styles.pressed,
        disabled && styles.disabled
      ]}
    >
      {icon ? <Ionicons name={icon} size={17} color={colors.text} /> : null}
      <Text style={styles.buttonLabel}>{label}</Text>
    </Pressable>
  );
}

export function LoadingState() {
  return (
    <View style={styles.state} accessibilityLabel="콘텐츠 불러오는 중">
      <ActivityIndicator color={colors.active} />
      <Text style={styles.stateText}>콘텐츠를 불러오고 있습니다</Text>
    </View>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <View style={styles.state}>
        <Ionicons name="musical-notes-outline" size={25} color={colors.active} />
        <Text accessibilityRole="header" style={styles.emptyTitle}>{title}</Text>
        <Text style={styles.stateText}>{description}</Text>
      </View>
    </Card>
  );
}

export function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return (
    <Card>
      <View style={styles.state} accessibilityRole="alert">
        <Ionicons name="alert-circle-outline" size={25} color={colors.danger} />
        <Text style={styles.emptyTitle}>콘텐츠를 표시할 수 없습니다</Text>
        <Text style={styles.stateText}>{message}</Text>
        <ActionButton label="다시 시도" icon="refresh" onPress={retry} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.card
  },
  sectionHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.xs
  },
  sectionTitle: { ...typography.heading, color: colors.text },
  button: {
    minHeight: 46,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderWidth: 1
  },
  primaryButton: { backgroundColor: colors.cta, borderColor: colors.ctaBorder },
  secondaryButton: { backgroundColor: colors.raised, borderColor: colors.controlBorder },
  buttonLabel: { ...typography.label, color: colors.text },
  pressed: { opacity: 0.68 },
  disabled: { opacity: 0.45 },
  state: { alignItems: "center", gap: spacing.xs, paddingVertical: spacing.xl },
  emptyTitle: { ...typography.heading, color: colors.text, textAlign: "center" },
  stateText: { ...typography.body, color: colors.muted, textAlign: "center" }
});

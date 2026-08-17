import { colors, spacing, typography } from "@/theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  eyebrow?: string;
  title: string;
  back?: boolean;
  notifications?: boolean;
};

export function AppHeader({ eyebrow, title, back = false, notifications = false }: Props) {
  const router = useRouter();
  const goBackOrHome = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/");
  };

  return (
    <View style={styles.header}>
      {back ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="이전 화면"
          hitSlop={8}
          onPress={goBackOrHome}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-back" size={23} color={colors.text} />
        </Pressable>
      ) : (
        <View style={styles.leadingSpace} />
      )}
      <View style={styles.copy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      </View>
      {notifications ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="알림함 열기"
          hitSlop={8}
          onPress={() => router.push("/notifications")}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <Ionicons name="notifications-outline" size={21} color={colors.text} />
        </Pressable>
      ) : (
        <View style={styles.leadingSpace} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 60,
    paddingVertical: spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  copy: { flex: 1 },
  eyebrow: {
    ...typography.caption,
    color: colors.active,
    letterSpacing: 0.8,
    textTransform: "uppercase"
  },
  title: { ...typography.title, color: colors.text },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.raised,
    borderWidth: 1,
    borderColor: colors.line
  },
  leadingSpace: { width: 44, height: 44 },
  pressed: { opacity: 0.66 }
});

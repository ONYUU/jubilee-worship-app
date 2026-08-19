import { useAppThemeStyles } from "@/theme/theme-provider";
import { spacing, typography, type ThemeColors } from "@/theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, type ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  eyebrow?: string;
  title: string;
  back?: boolean;
  notifications?: boolean;
  actionIcon?: ComponentProps<typeof Ionicons>["name"];
  actionLabel?: string;
  onActionPress?: () => void;
};

export function AppHeader({
  eyebrow,
  title,
  back = false,
  notifications = false,
  actionIcon,
  actionLabel,
  onActionPress
}: Props) {
  const router = useRouter();
  const { colors, styles } = useAppThemeStyles(createStyles);
  const documentTitle = title === "쥬빌리워십" ? title : `${title} · 쥬빌리워십`;
  useFocusEffect(
    useCallback(() => {
      if (typeof document !== "undefined") document.title = documentTitle;
    }, [documentTitle])
  );
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
      ) : null}
      <View style={styles.copy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      </View>
      {actionIcon && actionLabel && onActionPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          hitSlop={8}
          onPress={onActionPress}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <Ionicons name={actionIcon} size={22} color={colors.text} />
        </Pressable>
      ) : notifications ? (
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
        back ? <View style={styles.leadingSpace} /> : null
      )}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  header: {
    minHeight: 56,
    paddingVertical: spacing.xxs,
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
  title: { ...typography.title, fontSize: 22, lineHeight: 29, color: colors.text },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center"
  },
  leadingSpace: { width: 44, height: 44 },
  pressed: { opacity: 0.66 }
  });
}

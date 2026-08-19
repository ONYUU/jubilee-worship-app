import { AppHeader } from "@/components/app-header";
import { APP_INFO, WORSHIP_REMINDER_COPY } from "@/config/app-info";
import { Screen } from "@/components/screen";
import { ActionButton, Card, LoadingState } from "@/components/ui";
import {
  createTestPushPairingCode,
  DEFAULT_NOTIFICATION_PREFERENCES,
  loadNotificationPreferences,
  type NotificationPreferences,
  syncNotificationPreferences,
  testPushPairingAvailable,
  testPushPairingRemainingMs,
  type TestPushPairingCode,
  unregisterNotifications
} from "@/features/notifications/client";
import { useAppThemeStyles } from "@/theme/theme-provider";
import { radii, spacing, typography, type ThemeColors } from "@/theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import type * as Notifications from "expo-notifications";
import { useEffect, useState } from "react";
import { Alert, AppState, Platform, StyleSheet, Switch, Text, View } from "react-native";

const options: {
  key: keyof NotificationPreferences;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    key: "worshipReminder",
    title: WORSHIP_REMINDER_COPY.title,
    description: WORSHIP_REMINDER_COPY.description,
    icon: "calendar-outline"
  },
  {
    key: "scheduleChanges",
    title: "일정 변경·취소",
    description: "시간·장소 변경 또는 취소 소식을 알려드립니다.",
    icon: "alert-circle-outline"
  },
  {
    key: "setlistUpdates",
    title: "송리스트 공개·변경",
    description: "이번 주 찬양 목록이 공개되거나 바뀌면 알려드립니다.",
    icon: "musical-notes-outline"
  }
];

export default function NotificationSettingsScreen() {
  const { colors, styles } = useAppThemeStyles(createStyles);
  const [preferences, setPreferences] = useState(DEFAULT_NOTIFICATION_PREFERENCES);
  const [registered, setRegistered] = useState(false);
  const [permission, setPermission] = useState<
    Notifications.PermissionStatus | "unsupported" | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [pairing, setPairing] = useState<TestPushPairingCode | null>(null);

  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      try {
        const state = await loadNotificationPreferences();
        if (mounted) {
          setPreferences(state.preferences);
          setRegistered(state.registered);
          setPermission(state.permission);
        }
      } catch {
        // Keep the last known local state if the native permission query fails.
      }
    };
    void refresh().finally(() => {
      if (mounted) setLoading(false);
    });
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!pairing) return;

    const clearExpiredPairing = () => {
      if (testPushPairingRemainingMs(pairing) > 0) return;
      setPairing((current) => current?.pairingCode === pairing.pairingCode ? null : current);
    };
    clearExpiredPairing();
    const timeout = setTimeout(
      clearExpiredPairing,
      testPushPairingRemainingMs(pairing) + 100
    );
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") clearExpiredPairing();
    });
    return () => {
      clearTimeout(timeout);
      subscription.remove();
    };
  }, [pairing]);

  async function toggle(key: keyof NotificationPreferences, enabled: boolean) {
    const previous = preferences;
    const next = { ...preferences, [key]: enabled };
    setPreferences(next);
    setSaving(true);
    try {
      const result = await syncNotificationPreferences(next);
      setRegistered(result.registered);
      if (!result.registered) setPairing(null);
      const refreshed = await loadNotificationPreferences();
      setPermission(refreshed.permission);
    } catch (error) {
      setPreferences(previous);
      Alert.alert(
        "알림 설정을 저장하지 못했습니다",
        error instanceof Error ? error.message : "잠시 후 다시 시도해 주세요."
      );
    } finally {
      setSaving(false);
    }
  }

  function confirmUnregister() {
    Alert.alert(
      "이 기기의 알림을 해제할까요?",
      "서버에 저장된 이 기기의 알림 등록정보도 비활성화됩니다.",
      [
        { text: "취소", style: "cancel" },
        {
          text: "등록 해제",
          style: "destructive",
          onPress: () => {
            setSaving(true);
            void unregisterNotifications()
              .then(() => {
                setPreferences(DEFAULT_NOTIFICATION_PREFERENCES);
                setRegistered(false);
                setPairing(null);
              })
              .catch((error: unknown) => {
                Alert.alert(
                  "등록을 해제하지 못했습니다",
                  error instanceof Error ? error.message : "잠시 후 다시 시도해 주세요."
                );
              })
              .finally(() => setSaving(false));
          }
        }
      ]
    );
  }

  async function requestPairingCode() {
    setPairingLoading(true);
    try {
      setPairing(await createTestPushPairingCode());
    } catch (error) {
      setPairing(null);
      try {
        const refreshed = await loadNotificationPreferences();
        setRegistered(refreshed.registered);
        setPermission(refreshed.permission);
      } catch {
        // Keep the current screen state when the local permission check fails.
      }
      Alert.alert(
        "시험 기기 연결 코드를 만들지 못했습니다",
        error instanceof Error ? error.message : "잠시 후 다시 시도해 주세요."
      );
    } finally {
      setPairingLoading(false);
    }
  }

  if (loading) return <Screen><LoadingState /></Screen>;

  const permissionLabel =
    permission === "granted"
      ? "기기 알림 권한 허용됨"
      : permission === "denied"
        ? "기기 알림 권한 꺼짐"
        : permission === "unsupported"
          ? "실제 iOS·Android 앱에서 설정 가능"
          : "항목을 켜면 권한 요청";
  const canPairTestPush = registered
    && permission === "granted"
    && Object.values(preferences).some(Boolean)
    && testPushPairingAvailable();

  return (
    <Screen>
      <AppHeader eyebrow="Notifications" title="알림 설정" back />
      <Card>
        <View style={styles.statusRow}>
          <View style={[styles.statusIcon, registered && styles.statusIconActive]}>
            <Ionicons
              name={registered ? "notifications" : "notifications-outline"}
              size={22}
              color={registered ? colors.success : colors.active}
            />
          </View>
          <View style={styles.copy}>
            <Text style={styles.title}>{registered ? "이 기기 등록됨" : "알림 선택"}</Text>
            <Text style={styles.description}>{permissionLabel}</Text>
          </View>
        </View>
        {permission === "denied" && Platform.OS !== "web" ? (
          <ActionButton
            label="기기 설정 열기"
            icon="settings-outline"
            onPress={() =>
              void Linking.openSettings().catch(() =>
                Alert.alert("기기 설정을 열 수 없습니다", "설정 앱에서 알림 권한을 확인해 주세요.")
              )
            }
          />
        ) : null}
      </Card>

      <Card>
        {options.map((option, index) => (
          <View key={option.key} style={[styles.option, index > 0 && styles.optionBorder]}>
            <View style={styles.optionIcon}>
              <Ionicons name={option.icon} size={20} color={colors.active} />
            </View>
            <View style={styles.copy}>
              <Text style={styles.optionTitle}>{option.title}</Text>
              <Text style={styles.description}>{option.description}</Text>
            </View>
            <Switch
              accessibilityLabel={`${option.title} 알림`}
              disabled={saving || permission === "unsupported"}
              onValueChange={(value) => void toggle(option.key, value)}
              value={preferences[option.key]}
              trackColor={{ false: colors.secondarySurface, true: colors.activeSoft }}
              thumbColor={preferences[option.key] ? colors.active : colors.muted}
            />
          </View>
        ))}
      </Card>

      <Text style={styles.privacy}>
        {APP_INFO.operatorName}은 선택한 예배 소식만 전송합니다. 알림에는 개인별 정보나
        민감정보를 포함하지 않습니다.
      </Text>

      {canPairTestPush ? (
        <Card>
          <View style={styles.pairingHeader}>
            <View style={styles.optionIcon}>
              <Ionicons name="phone-portrait-outline" size={20} color={colors.active} />
            </View>
            <View style={styles.copy}>
              <Text style={styles.optionTitle}>시험 기기 연결</Text>
              <Text style={styles.description}>
                이 개발·미리보기 기기를 오너가 승인할 때만 사용하는 1회용 코드입니다.
              </Text>
            </View>
          </View>
          {pairing ? (
            <View style={styles.pairingCodeBox}>
              <Text selectable style={styles.pairingCode}>{pairing.pairingCode}</Text>
              <Text style={styles.description}>
                {new Date(pairing.expiresAt).toLocaleTimeString("ko-KR", {
                  hour: "2-digit",
                  minute: "2-digit"
                })}까지 관리자 화면에 입력해 주세요. 사용하거나 만료되면 다시 쓸 수 없습니다.
              </Text>
            </View>
          ) : null}
          <ActionButton
            label={pairingLoading ? "코드 만드는 중" : pairing ? "새 연결 코드 만들기" : "연결 코드 만들기"}
            icon="key-outline"
            disabled={pairingLoading || saving}
            onPress={() => void requestPairingCode()}
          />
        </Card>
      ) : null}

      {registered ? (
        <ActionButton
          label={saving ? "처리 중" : "이 기기 등록 해제"}
          icon="trash-outline"
          disabled={saving}
          onPress={confirmUnregister}
        />
      ) : null}
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  statusRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  statusIcon: {
    width: 46,
    height: 46,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.activeSoft
  },
  statusIconActive: { backgroundColor: colors.successSoft },
  copy: { flex: 1, gap: 3 },
  title: { ...typography.heading, color: colors.text },
  description: { ...typography.caption, color: colors.muted },
  option: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm
  },
  optionBorder: { borderTopWidth: 1, borderTopColor: colors.line },
  optionIcon: {
    width: 38,
    height: 38,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.activeSoft
  },
  optionTitle: { ...typography.label, color: colors.text },
  pairingHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  pairingCodeBox: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.activeSoft
  },
  pairingCode: {
    ...typography.heading,
    color: colors.text,
    textAlign: "center",
    letterSpacing: 2
  },
  privacy: { ...typography.caption, color: colors.muted, textAlign: "center", paddingHorizontal: spacing.md }
  });
}

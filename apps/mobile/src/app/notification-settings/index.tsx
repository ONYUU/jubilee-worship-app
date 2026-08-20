import { AppHeader } from "@/components/app-header";
import { APP_INFO, WORSHIP_REMINDER_COPY } from "@/config/app-info";
import { Screen } from "@/components/screen";
import { ActionButton, Card, LoadingState } from "@/components/ui";
import {
  createTestPushPairingCode,
  DEFAULT_NOTIFICATION_PREFERENCES,
  loadNotificationPreferences,
  type NotificationPreferences,
  type PendingReinstallRecovery,
  reinstallRecoveryRemainingMs,
  scrubExpiredPendingReinstallRecovery,
  syncNotificationPreferences,
  testPushPairingAvailable,
  testPushPairingRemainingMs,
  type TestPushPairingCode,
  unregisterNotifications
} from "@/features/notifications/client";
import {
  CURRENT_SENSITIVE_INTEREST_CONSENT_RECORD,
  CURRENT_SENSITIVE_INTEREST_CONSENT_VERSION,
  SENSITIVE_INTEREST_AGE_CONFIRMATION_LABEL,
  SENSITIVE_INTEREST_CONSENT_DISCLOSURE,
  SENSITIVE_INTEREST_CONSENT_TITLE,
  type SensitiveInterestConsentRecord
} from "@/features/notifications/sensitive-interest-consent";
import { useAppThemeStyles } from "@/theme/theme-provider";
import { radii, spacing, typography, type ThemeColors } from "@/theme/tokens";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import type * as Notifications from "expo-notifications";
import { useEffect, useState } from "react";
import {
  Alert,
  AppState,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View
} from "react-native";

const REINSTALL_RECOVERY_COPY = {
  title: "\uC7AC\uC124\uCE58 \uBCF5\uAD6C \uC2B9\uC778 \uB300\uAE30",
  description:
    "\uC0C8 \uC124\uCE58\uB97C \uC5F0\uACB0\uD558\uB824\uBA74 \uC624\uB108 \uC2B9\uC778 \uD6C4 \uC774 \uAE30\uAE30\uAC00 \uD604\uC7AC \uB3D9\uC758\xB7\uC54C\uB9BC \uC124\uC815\uC73C\uB85C \uB4F1\uB85D\uC744 \uC644\uB8CC\uD574\uC57C \uD569\uB2C8\uB2E4.",
  instruction:
    "\uC774 \uCF54\uB4DC\uB97C \uAD00\uB9AC\uC790 \uD654\uBA74\uC5D0 \uC785\uB825\uD558\uACE0, \uD45C\uC2DC\uB41C \uC774\uC804 \uAE30\uAE30\uC640 \uC0C8 \uC124\uCE58\uAC00 \uB9DE\uB294\uC9C0 \uD655\uC778\uD574 \uC8FC\uC138\uC694.",
  privacy:
    "\uCF54\uB4DC\uB294 \uC774 \uAE30\uAE30\uC5D0\uB9CC \uBCF4\uAD00\uB418\uBA70 \uD1A0\uD070\xB7\uC124\uCE58 \uC778\uC99D\uC815\uBCF4\uB294 \uD45C\uC2DC\uB418\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.",
  confirm: "\uC2B9\uC778 \uC644\uB8CC \uD655\uC778",
  renew: "\uC0C8 \uBCF5\uAD6C \uCF54\uB4DC \uB9CC\uB4E4\uAE30",
  stillPending: "\uC544\uC9C1 \uC624\uB108 \uC2B9\uC778\uC774 \uD655\uC778\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4.",
  completed: "\uC7AC\uC124\uCE58 \uBCF5\uAD6C\uAC00 \uC644\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4.",
  expired: "\uCF54\uB4DC \uB9CC\uB8CC\uB428",
  validUntil: "\uAE4C\uC9C0 \uC720\uD6A8",
  checkFailed: "\uC7AC\uC124\uCE58 \uBCF5\uAD6C \uC0C1\uD0DC\uB97C \uD655\uC778\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4",
  withdrawalTitle: "\uC54C\uB9BC \uD574\uC81C \uCC98\uB9AC \uB300\uAE30",
  withdrawalDescription:
    "\uC54C\uB9BC\uC740 \uBAA8\uB450 \uAEBC\uC9C4 \uC0C1\uD0DC\uC785\uB2C8\uB2E4. \uB124\uD2B8\uC6CC\uD06C\uAC00 \uC5F0\uACB0\uB418\uBA74 \uAE30\uC874 \uAC1C\uBC1C\xB7\uBBF8\uB9AC\uBCF4\uAE30 \uC54C\uB9BC \uC5F0\uACB0 \uD574\uC81C\uB97C \uB2E4\uC2DC \uC2DC\uB3C4\uD569\uB2C8\uB2E4.",
  withdrawalInstruction:
    "\uD574\uC81C\uAC00 \uC644\uB8CC\uB420 \uB54C\uAE4C\uC9C0 \uC77C\uD68C\uC6A9 \uCF54\uB4DC\xB7\uAE30\uAE30 \uC778\uC99D\uC815\uBCF4\xB7\uD1A0\uD070\uC740 \uAE30\uAE30 \uBCF4\uC548 \uC800\uC7A5\uC18C\uC5D0\uB9CC \uC720\uC9C0\uB418\uBA70 \uD654\uBA74\uC774\uB098 \uB85C\uADF8\uC5D0 \uD45C\uC2DC\uB418\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.",
  withdrawalCheck: "\uC54C\uB9BC \uD574\uC81C \uB2E4\uC2DC \uC2DC\uB3C4"
} as const;

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
  const router = useRouter();
  const { colors, styles } = useAppThemeStyles(createStyles);
  const [preferences, setPreferences] = useState(DEFAULT_NOTIFICATION_PREFERENCES);
  const [registered, setRegistered] = useState(false);
  const [consented, setConsented] = useState(false);
  const [permission, setPermission] = useState<
    Notifications.PermissionStatus | "unsupported" | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [pairing, setPairing] = useState<TestPushPairingCode | null>(null);
  const [reinstallRecovery, setReinstallRecovery] =
    useState<PendingReinstallRecovery | null>(null);
  const [pendingConsentKey, setPendingConsentKey] = useState<
    keyof NotificationPreferences | null
  >(null);
  const [age14OrOverConfirmed, setAge14OrOverConfirmed] = useState(false);

  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      try {
        const state = await loadNotificationPreferences();
        if (mounted) {
          setPreferences(state.preferences);
          setRegistered(state.registered);
          setConsented(state.consented);
          setPermission(state.permission);
          setReinstallRecovery(state.reinstallRecovery);
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

  useEffect(() => {
    if (!reinstallRecovery) return;
    const remaining = reinstallRecoveryRemainingMs(reinstallRecovery);
    if (remaining === 0) return;
    const timeout = setTimeout(() => {
      void scrubExpiredPendingReinstallRecovery()
        .then(setReinstallRecovery)
        .catch(() => {
          setReinstallRecovery((current) => current
            ? { ...current, recoveryCode: null }
            : null);
        });
    }, remaining + 100);
    return () => clearTimeout(timeout);
  }, [reinstallRecovery]);

  async function saveToggle(
    key: keyof NotificationPreferences,
    enabled: boolean,
    affirmativeConsent?: SensitiveInterestConsentRecord
  ) {
    const next = { ...preferences, [key]: enabled };
    setPreferences(next);
    setSaving(true);
    try {
      const result = await syncNotificationPreferences(next, affirmativeConsent);
      setRegistered(result.registered);
      setReinstallRecovery(result.reinstallRecovery);
      if (!result.registered) setPairing(null);
      if (result.cleanupPending) {
        Alert.alert(
          "기기 알림은 꺼졌습니다",
          "네트워크 문제로 서버 등록 삭제가 대기 중입니다. 앱을 다시 열면 자동으로 재시도합니다."
        );
      }
      const refreshed = await loadNotificationPreferences();
      setPreferences(refreshed.preferences);
      setRegistered(refreshed.registered);
      setConsented(refreshed.consented);
      setPermission(refreshed.permission);
      setReinstallRecovery(refreshed.reinstallRecovery);
    } catch (error) {
      try {
        const refreshed = await loadNotificationPreferences();
        setPreferences(refreshed.preferences);
        setRegistered(refreshed.registered);
        setConsented(refreshed.consented);
        setPermission(refreshed.permission);
        setReinstallRecovery(refreshed.reinstallRecovery);
        if (!refreshed.registered) setPairing(null);
      } catch {
        setPreferences(DEFAULT_NOTIFICATION_PREFERENCES);
        setRegistered(false);
        setConsented(false);
        setPermission(null);
        setReinstallRecovery(null);
        setPairing(null);
      }
      Alert.alert(
        "알림 설정을 저장하지 못했습니다",
        error instanceof Error ? error.message : "잠시 후 다시 시도해 주세요."
      );
    } finally {
      setSaving(false);
    }
  }

  function toggle(key: keyof NotificationPreferences, enabled: boolean) {
    if (enabled && !consented) {
      setAge14OrOverConfirmed(false);
      setPendingConsentKey(key);
      return;
    }
    void saveToggle(key, enabled);
  }

  function closeConsentModal() {
    setPendingConsentKey(null);
    setAge14OrOverConfirmed(false);
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
              .then(async (result) => {
                setPreferences(DEFAULT_NOTIFICATION_PREFERENCES);
                setRegistered(false);
                setConsented(false);
                setPairing(null);
                if (result.cleanupPending) {
                  try {
                    const refreshed = await loadNotificationPreferences();
                    setPermission(refreshed.permission);
                    setReinstallRecovery(refreshed.reinstallRecovery);
                  } catch {
                    // Keep any in-memory recovery marker visible; the secure
                    // cleanup capability remains on-device for startup retry.
                  }
                  Alert.alert(
                    "기기 알림은 꺼졌습니다",
                    "네트워크 문제로 서버 등록 삭제가 대기 중입니다. 앱을 다시 열면 자동으로 재시도합니다."
                  );
                } else {
                  setReinstallRecovery(null);
                }
              })
              .catch(async (error: unknown) => {
                setPreferences(DEFAULT_NOTIFICATION_PREFERENCES);
                setRegistered(false);
                setConsented(false);
                setPairing(null);
                try {
                  const refreshed = await loadNotificationPreferences();
                  setPermission(refreshed.permission);
                  setReinstallRecovery(refreshed.reinstallRecovery);
                } catch {
                  // Fail closed in the UI when even the local retry state
                  // cannot be re-read; do not present an optimistic ON state.
                }
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
        setConsented(refreshed.consented);
        setPermission(refreshed.permission);
        setReinstallRecovery(refreshed.reinstallRecovery);
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

  async function checkOrRenewReinstallRecovery() {
    setSaving(true);
    try {
      const wasExpired = reinstallRecovery
        ? reinstallRecoveryRemainingMs(reinstallRecovery) === 0
        : false;
      const result = await syncNotificationPreferences(preferences);
      setRegistered(result.registered);
      setReinstallRecovery(result.reinstallRecovery);
      const refreshed = await loadNotificationPreferences();
      setPreferences(refreshed.preferences);
      setRegistered(refreshed.registered);
      setConsented(refreshed.consented);
      setPermission(refreshed.permission);
      setReinstallRecovery(refreshed.reinstallRecovery);
      if (refreshed.registered) {
        Alert.alert(REINSTALL_RECOVERY_COPY.completed);
      } else if (!wasExpired && refreshed.reinstallRecovery) {
        Alert.alert(
          REINSTALL_RECOVERY_COPY.title,
          REINSTALL_RECOVERY_COPY.stillPending
        );
      }
    } catch (error) {
      Alert.alert(
        REINSTALL_RECOVERY_COPY.checkFailed,
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Screen><LoadingState /></Screen>;

  const reinstallRecoveryExpired = reinstallRecovery
    ? reinstallRecoveryRemainingMs(reinstallRecovery) === 0
    : false;
  const reinstallWithdrawalPending = reinstallRecovery?.mode === "withdrawal";
  const permissionLabel = reinstallRecovery
    ? reinstallWithdrawalPending
      ? REINSTALL_RECOVERY_COPY.withdrawalDescription
      : REINSTALL_RECOVERY_COPY.description
    : permission === "granted"
      ? "기기 알림 권한 허용됨"
      : permission === "denied"
        ? "기기 알림 권한 꺼짐"
        : permission === "unsupported"
          ? "실제 iOS·Android 앱에서 설정 가능"
          : consented
            ? "항목을 켜면 기기 권한 요청"
            : "별도 동의 후 기기 권한 요청";
  const canPairTestPush = registered
    && permission === "granted"
    && Object.values(preferences).some(Boolean)
    && testPushPairingAvailable();

  return (
    <Screen>
      <Modal
        animationType="slide"
        presentationStyle="pageSheet"
        transparent={Platform.OS === "android"}
        visible={pendingConsentKey !== null}
        onRequestClose={closeConsentModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <ScrollView
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalIcon}>
                <Ionicons name="shield-checkmark-outline" size={28} color={colors.active} />
              </View>
              <Text accessibilityRole="header" style={styles.modalTitle}>
                {SENSITIVE_INTEREST_CONSENT_TITLE}
              </Text>
              <Text style={styles.modalBody}>{SENSITIVE_INTEREST_CONSENT_DISCLOSURE}</Text>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityLabel={SENSITIVE_INTEREST_AGE_CONFIRMATION_LABEL}
                accessibilityState={{ checked: age14OrOverConfirmed }}
                onPress={() => setAge14OrOverConfirmed((current) => !current)}
                style={({ pressed }) => [
                  styles.ageConfirmation,
                  age14OrOverConfirmed && styles.ageConfirmationChecked,
                  pressed && styles.ageConfirmationPressed
                ]}
              >
                <Ionicons
                  name={age14OrOverConfirmed ? "checkbox" : "square-outline"}
                  size={24}
                  color={age14OrOverConfirmed ? colors.active : colors.muted}
                />
                <View style={styles.copy}>
                  <Text style={styles.ageConfirmationLabel}>
                    {SENSITIVE_INTEREST_AGE_CONFIRMATION_LABEL}
                  </Text>
                  <Text style={styles.description}>
                    생년월일은 수집하지 않으며, 이 확인은 알림 기능에만 적용됩니다.
                  </Text>
                </View>
              </Pressable>
              <Text style={styles.modalVersion}>
                동의 버전 {CURRENT_SENSITIVE_INTEREST_CONSENT_VERSION}
              </Text>
              <ActionButton
                label="개인정보처리방침 보기"
                icon="document-text-outline"
                onPress={() => {
                  closeConsentModal();
                  router.push("/privacy");
                }}
              />
              <ActionButton
                label="별도 동의하고 알림 켜기"
                icon="notifications-outline"
                primary
                disabled={!age14OrOverConfirmed}
                onPress={() => {
                  const key = pendingConsentKey;
                  closeConsentModal();
                  if (key) {
                    void saveToggle(
                      key,
                      true,
                      CURRENT_SENSITIVE_INTEREST_CONSENT_RECORD
                    );
                  }
                }}
              />
              <ActionButton
                label="동의하지 않음"
                onPress={closeConsentModal}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
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
        <View style={styles.consentHeader}>
          <View style={styles.optionIcon}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.active} />
          </View>
          <View style={styles.copy}>
            <Text style={styles.optionTitle}>예배 알림 정보 처리</Text>
            <Text style={consented ? styles.consentActive : styles.consentInactive}>
              {consented ? "별도 동의됨 · 언제든 철회 가능" : "동의하지 않음 · 앱의 다른 기능은 이용 가능"}
            </Text>
          </View>
        </View>
        <Text style={styles.disclosure}>{SENSITIVE_INTEREST_CONSENT_DISCLOSURE}</Text>
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
              onValueChange={(value) => toggle(option.key, value)}
              value={preferences[option.key]}
              trackColor={{ false: colors.secondarySurface, true: colors.activeSoft }}
              thumbColor={preferences[option.key] ? colors.active : colors.muted}
            />
          </View>
        ))}
      </Card>

      {reinstallRecovery ? (
        <Card>
          <View style={styles.pairingHeader}>
            <View style={styles.optionIcon}>
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.active} />
            </View>
            <View style={styles.copy}>
              <Text style={styles.optionTitle}>
                {reinstallWithdrawalPending
                  ? REINSTALL_RECOVERY_COPY.withdrawalTitle
                  : REINSTALL_RECOVERY_COPY.title}
              </Text>
              <Text style={styles.description}>
                {reinstallWithdrawalPending
                  ? REINSTALL_RECOVERY_COPY.withdrawalDescription
                  : REINSTALL_RECOVERY_COPY.description}
              </Text>
            </View>
          </View>
          {!reinstallWithdrawalPending ? (
            <View style={styles.pairingCodeBox}>
              {!reinstallRecoveryExpired && reinstallRecovery.recoveryCode ? (
                <Text selectable style={styles.pairingCode}>
                  {reinstallRecovery.recoveryCode}
                </Text>
              ) : null}
              <Text style={styles.description}>
                {reinstallRecoveryExpired
                  ? REINSTALL_RECOVERY_COPY.expired
                  : `${new Date(reinstallRecovery.expiresAt).toLocaleTimeString("ko-KR", {
                    hour: "2-digit",
                    minute: "2-digit"
                  })} ${REINSTALL_RECOVERY_COPY.validUntil}`}
              </Text>
            </View>
          ) : null}
          <Text style={styles.disclosure}>
            {reinstallWithdrawalPending
              ? REINSTALL_RECOVERY_COPY.withdrawalInstruction
              : REINSTALL_RECOVERY_COPY.instruction}
          </Text>
          <Text style={styles.description}>{REINSTALL_RECOVERY_COPY.privacy}</Text>
          <ActionButton
            label={reinstallWithdrawalPending
              ? REINSTALL_RECOVERY_COPY.withdrawalCheck
              : reinstallRecoveryExpired
                ? REINSTALL_RECOVERY_COPY.renew
                : REINSTALL_RECOVERY_COPY.confirm}
            icon={reinstallRecoveryExpired ? "refresh-outline" : "checkmark-circle-outline"}
            disabled={saving}
            onPress={() => void checkOrRenewReinstallRecovery()}
          />
        </Card>
      ) : null}

      <Text style={styles.privacy}>
        {APP_INFO.operatorName}은 선택한 예배 소식만 전송하며, 미동의 시 서버 등록이나
        기기 알림 권한 요청을 시작하지 않습니다.
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

      {(registered || reinstallRecovery) ? (
        <ActionButton
          label={saving ? "처리 중" : "알림 동의 철회 및 등록 해제"}
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
  consentHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  consentActive: { ...typography.caption, color: colors.success },
  consentInactive: { ...typography.caption, color: colors.muted },
  disclosure: {
    ...typography.caption,
    color: colors.text,
    marginTop: spacing.sm,
    lineHeight: 20
  },
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
  privacy: { ...typography.caption, color: colors.muted, textAlign: "center", paddingHorizontal: spacing.md },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: Platform.OS === "android" ? "rgba(0,0,0,0.5)" : colors.background
  },
  modalSheet: {
    maxHeight: "94%",
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    backgroundColor: colors.background
  },
  modalContent: { gap: spacing.md, padding: spacing.lg, paddingBottom: spacing.xl },
  modalIcon: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.activeSoft,
    alignSelf: "center"
  },
  modalTitle: { ...typography.heading, color: colors.text, textAlign: "center" },
  modalBody: { ...typography.body, color: colors.text, lineHeight: 24 },
  ageConfirmation: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.controlBorder,
    backgroundColor: colors.raised
  },
  ageConfirmationChecked: {
    borderColor: colors.active,
    backgroundColor: colors.activeSoft
  },
  ageConfirmationPressed: { opacity: 0.72 },
  ageConfirmationLabel: { ...typography.label, color: colors.text },
  modalVersion: { ...typography.caption, color: colors.muted, textAlign: "center" }
  });
}

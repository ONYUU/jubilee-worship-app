import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Crypto from "expo-crypto";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { resolveNotificationAppVariant } from "./app-variant";
import { classifyNotificationDataApiResult } from "./data-api-result";
import { isInvalidInstallationError, NotificationSetupError } from "./errors";
import {
  createNotificationMutationQueue,
  isSameInstallationCredential,
  shouldFailClosedNotificationState,
  shouldReportNotificationRegistered,
  shouldRetryPendingNotificationCleanup
} from "./mutation-queue";
import {
  createReinstallRecoveryCapability,
  createReinstallRecoveryCancelBody,
  createReinstallRecoveryFinalizeBody,
  createProvisionalPendingReinstallRecovery,
  createReinstallRecoveryRequestBody,
  isConfirmedReinstallRecoveryWithdrawal,
  parsePendingReinstallRecovery,
  parseStoredPendingReinstallRecovery,
  persistReinstallRecoveryRequest,
  ReinstallRecoveryStorageError,
  reinstallRecoveryRemainingMs,
  scrubExpiredReinstallRecoveryCapability,
  serializePendingReinstallRecovery,
  type PendingReinstallRecovery
} from "./reinstall-recovery";
import {
  isTestPushPairingVariant,
  parseTestPushPairingCode,
  type TestPushPairingCode
} from "./test-push-pairing";
import {
  CURRENT_SENSITIVE_INTEREST_CONSENT_RECORD,
  isCurrentSensitiveInterestConsentRecord,
  parseCurrentSensitiveInterestConsent,
  serializeCurrentSensitiveInterestConsent,
  type SensitiveInterestConsentRecord
} from "./sensitive-interest-consent";

export { NotificationSetupError } from "./errors";
export { reinstallRecoveryRemainingMs } from "./reinstall-recovery";
export type { PendingReinstallRecovery } from "./reinstall-recovery";
export { testPushPairingRemainingMs } from "./test-push-pairing";
export type { TestPushPairingCode } from "./test-push-pairing";

const INSTALLATION_KEY = "jubilee.push-installation.v1";
const PREFERENCES_KEY = "jubilee.push-preferences.v1";
const SENSITIVE_INTEREST_CONSENT_KEY = "jubilee.sensitive-interest-consent.v1";
const CONSENT_CLEANUP_PENDING_KEY = "jubilee.sensitive-interest-cleanup-pending.v1";
const REINSTALL_RECOVERY_PENDING_KEY = "jubilee.reinstall-recovery-pending.v1";
const enqueueNotificationMutation = createNotificationMutationQueue();

export type NotificationPreferences = {
  worshipReminder: boolean;
  scheduleChanges: boolean;
  setlistUpdates: boolean;
};

type InstallationCredentials = {
  installationId: string;
  installationSecret: string;
  registrationState: "pending" | "committed";
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  worshipReminder: false,
  scheduleChanges: false,
  setlistUpdates: false
};

function isPreferences(value: unknown): value is NotificationPreferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.worshipReminder === "boolean" &&
    typeof candidate.scheduleChanges === "boolean" &&
    typeof candidate.setlistUpdates === "boolean"
  );
}

function isCredentials(
  value: unknown
): value is Omit<InstallationCredentials, "registrationState"> & {
  registrationState?: "pending" | "committed";
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.installationId === "string" &&
    /^[0-9a-f-]{36}$/i.test(candidate.installationId) &&
    typeof candidate.installationSecret === "string" &&
    candidate.installationSecret.length >= 32 &&
    candidate.installationSecret.length <= 128 &&
    (
      candidate.registrationState === undefined
      || candidate.registrationState === "pending"
      || candidate.registrationState === "committed"
    )
  );
}

async function readCredentials(): Promise<InstallationCredentials | null> {
  if (Platform.OS === "web") return null;
  try {
    const raw = await SecureStore.getItemAsync(INSTALLATION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isCredentials(parsed)) return null;
    return {
      installationId: parsed.installationId,
      installationSecret: parsed.installationSecret,
      // Credentials written before the two-phase marker existed are verified
      // with the server before the UI may call them registered.
      registrationState: parsed.registrationState ?? "pending"
    };
  } catch {
    return null;
  }
}

async function readPreferences(): Promise<NotificationPreferences> {
  try {
    const raw = await AsyncStorage.getItem(PREFERENCES_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isPreferences(parsed)) return parsed;
    }
  } catch {
    // Corrupted optional preferences safely fall back to disabled.
  }
  return DEFAULT_NOTIFICATION_PREFERENCES;
}

async function readSensitiveInterestConsent(): Promise<SensitiveInterestConsentRecord | null> {
  if (Platform.OS === "web") return null;
  try {
    return parseCurrentSensitiveInterestConsent(
      await SecureStore.getItemAsync(SENSITIVE_INTEREST_CONSENT_KEY)
    );
  } catch {
    return null;
  }
}

async function writeCredentials(value: InstallationCredentials): Promise<void> {
  await SecureStore.setItemAsync(INSTALLATION_KEY, JSON.stringify(value), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
  });
}

async function clearCredentials(): Promise<void> {
  if (Platform.OS === "web") return;
  await SecureStore.deleteItemAsync(INSTALLATION_KEY);
}

async function readPendingReinstallRecovery(): Promise<PendingReinstallRecovery | null> {
  if (Platform.OS === "web") return null;
  const raw = await SecureStore.getItemAsync(REINSTALL_RECOVERY_PENDING_KEY);
  const parsed = parseStoredPendingReinstallRecovery(raw);
  if (!parsed) {
    if (raw !== null) {
      throw new NotificationSetupError(
        "재설치 복구 정보가 손상되어 자동 해제를 계속할 수 없습니다.",
        "notification_recovery_local_storage_failed"
      );
    }
    return null;
  }
  const minimized = scrubExpiredReinstallRecoveryCapability(parsed);
  if (minimized !== parsed) {
    try {
      await writePendingReinstallRecovery(minimized);
    } catch {
      // Keep the minimized in-memory state and retry persistent scrubbing on
      // the next read. The expired code is never returned to the UI.
    }
  }
  return minimized;
}

async function writePendingReinstallRecovery(
  value: PendingReinstallRecovery
): Promise<void> {
  if (Platform.OS === "web") return;
  await SecureStore.setItemAsync(
    REINSTALL_RECOVERY_PENDING_KEY,
    serializePendingReinstallRecovery(value),
    { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }
  );
}

async function clearPendingReinstallRecovery(): Promise<void> {
  if (Platform.OS === "web") return;
  await SecureStore.deleteItemAsync(REINSTALL_RECOVERY_PENDING_KEY);
}

async function clearCredentialsIfCurrent(
  expected: InstallationCredentials
): Promise<boolean> {
  const current = await readCredentials();
  if (!isSameInstallationCredential(expected, current)) return false;
  await clearCredentials();
  return true;
}

async function markCredentialsCommittedIfCurrent(
  expected: InstallationCredentials
): Promise<boolean> {
  const current = await readCredentials();
  if (!isSameInstallationCredential(expected, current)) return false;
  await writeCredentials({ ...current!, registrationState: "committed" });
  return true;
}

async function clearCredentialsAndPendingIfCurrent(
  expected: InstallationCredentials
): Promise<boolean> {
  const current = await readCredentials();
  if (!isSameInstallationCredential(expected, current)) return false;
  await Promise.all([
    clearCredentials(),
    clearCleanupPending(),
    clearPendingReinstallRecovery()
  ]);
  return true;
}

async function writeSensitiveInterestConsent(): Promise<void> {
  if (Platform.OS === "web") return;
  await SecureStore.setItemAsync(
    SENSITIVE_INTEREST_CONSENT_KEY,
    serializeCurrentSensitiveInterestConsent(),
    { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }
  );
}

async function clearSensitiveInterestConsent(): Promise<void> {
  if (Platform.OS === "web") return;
  await SecureStore.deleteItemAsync(SENSITIVE_INTEREST_CONSENT_KEY);
}

async function writeCleanupPending(): Promise<void> {
  if (Platform.OS === "web") return;
  await SecureStore.setItemAsync(CONSENT_CLEANUP_PENDING_KEY, "true", {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
  });
}

async function clearCleanupPending(): Promise<void> {
  if (Platform.OS === "web") return;
  await SecureStore.deleteItemAsync(CONSENT_CLEANUP_PENDING_KEY);
}

async function readCleanupPending(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    return await SecureStore.getItemAsync(CONSENT_CLEANUP_PENDING_KEY) === "true";
  } catch {
    // A marker read failure must not permit a new registration.
    return true;
  }
}

async function createInstallationCredentials(): Promise<InstallationCredentials> {
  const installationSecret = [...await Crypto.getRandomBytesAsync(32)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return {
    installationId: Crypto.randomUUID(),
    installationSecret,
    registrationState: "pending"
  };
}

type InstallationCredentialMaterial = {
  proof: string;
  storeHash: string;
  pairingProof: string;
  pairingStoreHash: string;
};

async function installationCredentialMaterial(
  credentials: InstallationCredentials
): Promise<InstallationCredentialMaterial> {
  const proof = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    credentials.installationSecret
  );
  const [storeHash, pairingProof] = await Promise.all([
    Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, proof),
    Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `jubilee:test-pairing:v1\n${credentials.installationSecret}`
    )
  ]);
  return {
    proof,
    storeHash,
    pairingProof,
    pairingStoreHash: await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      pairingProof
    )
  };
}

function publicConfig(): { url: string; key: string } {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new NotificationSetupError("알림 서버 설정이 아직 연결되지 않았습니다.");
  }
  return { url, key };
}

function projectId(): string {
  const explicit = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  const configured = Constants.expoConfig?.extra?.eas?.projectId;
  const easProject = Constants.easConfig?.projectId;
  const value = explicit ?? (typeof configured === "string" ? configured : null) ?? easProject;
  if (!value) {
    throw new NotificationSetupError("알림용 앱 프로젝트 연결이 아직 완료되지 않았습니다.");
  }
  return value;
}

function appVersion(): string {
  const marketingVersion = Constants.nativeAppVersion
    ?? Constants.expoConfig?.version
    ?? "1.0.0";
  const buildVersion = Constants.nativeBuildVersion;
  return (buildVersion
    ? `${marketingVersion}+${buildVersion}`
    : marketingVersion
  ).slice(0, 64);
}

function appVariant() {
  return resolveNotificationAppVariant(Constants.expoConfig?.extra);
}

export function testPushPairingAvailable(): boolean {
  return isTestPushPairingVariant(appVariant());
}

async function functionRequest<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { url, key } = publicConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(`${url}/functions/v1/${name}`, {
      method: "POST",
      headers: {
        apikey: key,
        ...(key.startsWith("eyJ") ? { authorization: `Bearer ${key}` } : {}),
        "content-type": "application/json",
        "x-region": "ap-northeast-2"
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    if (!response.ok) {
      let message = "알림 서버 요청을 완료하지 못했습니다.";
      let code = "notification_request_failed";
      try {
        const payload: unknown = await response.json();
        if (
          payload &&
          typeof payload === "object" &&
          "message" in payload &&
          typeof payload.message === "string"
        ) {
          message = payload.message;
        }
        if (
          payload &&
          typeof payload === "object" &&
          "error" in payload &&
          typeof payload.error === "string"
        ) {
          code = payload.error;
        }
      } catch {
        // Use the stable user-facing fallback when the server body is unavailable.
      }
      throw new NotificationSetupError(message, code, response.status);
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof NotificationSetupError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new NotificationSetupError("알림 서버 응답 시간이 초과됐습니다.");
    }
    throw new NotificationSetupError("네트워크 상태를 확인한 뒤 다시 시도해 주세요.");
  } finally {
    clearTimeout(timeout);
  }
}

async function dataApiRpcRequest(
  name: string,
  body: Record<string, unknown>,
  privateHeaders: Record<string, string> = {}
): Promise<unknown> {
  const { url, key } = publicConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: {
        apikey: key,
        accept: "application/json",
        "content-type": "application/json",
        "content-profile": "public",
        ...(key.startsWith("eyJ") ? { authorization: `Bearer ${key}` } : {}),
        ...privateHeaders
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      // Missing or malformed typed v2 results fail closed below.
    }
    const outcome = classifyNotificationDataApiResult(
      response.status,
      response.ok,
      payload
    );
    if (outcome === "ok") return payload;
    if (
      name === "notification_request_reinstall_recovery_v1"
      && payload
      && typeof payload === "object"
      && !Array.isArray(payload)
      && (payload as Record<string, unknown>).status === "pending_owner_approval"
    ) {
      if (!response.ok) {
        throw new NotificationSetupError(
          "Recovery request failed.",
          "notification_recovery_request_failed",
          response.status
        );
      }
      return payload;
    }
    if (
      name === "notification_cancel_reinstall_recovery_v1"
      && payload
      && typeof payload === "object"
      && !Array.isArray(payload)
      && (payload as Record<string, unknown>).status === "withdrawn"
    ) {
      if (!response.ok) {
        throw new NotificationSetupError(
          "알림 연결 해제를 확인하지 못했습니다.",
          "notification_recovery_unlink_failed",
          response.status
        );
      }
      return payload;
    }
    if (
      name === "notification_finalize_reinstall_recovery_v1"
      && payload
      && typeof payload === "object"
      && !Array.isArray(payload)
      && (payload as Record<string, unknown>).status === "error"
      && typeof (payload as Record<string, unknown>).code === "string"
      && [
        "RECOVERY_NOT_AUTHORIZED",
        "RECOVERY_EXPIRED",
        "RECOVERY_NOT_AVAILABLE"
      ].includes((payload as Record<string, unknown>).code as string)
    ) {
      throw new NotificationSetupError(
        "오너 승인 상태를 확인하지 못했습니다.",
        `notification_${String((payload as Record<string, unknown>).code).toLowerCase()}`,
        response.status
      );
    }
    if (
      name === "notification_cancel_reinstall_recovery_v1"
      && payload
      && typeof payload === "object"
      && !Array.isArray(payload)
      && (payload as Record<string, unknown>).code ===
        "RECOVERY_UNLINK_NOT_AVAILABLE"
    ) {
      throw new NotificationSetupError(
        "기존 알림 연결을 확인하지 못했습니다. 알림은 계속 꺼진 상태로 두고 관리자에게 문의해 주세요.",
        "notification_recovery_unlink_not_available",
        response.status
      );
    }
    if (outcome === "invalid_installation") {
      throw new NotificationSetupError(
        "설치 인증정보가 올바르지 않습니다.",
        "invalid_installation",
        response.status
      );
    }
    if (outcome === "rate_limited") {
      throw new NotificationSetupError(
        "요청이 많습니다. 잠시 후 다시 시도해 주세요.",
        "rate_limited",
        response.status
      );
    }
    if (outcome === "duplicate_registration") {
      throw new NotificationSetupError(
        "재설치 후 알림 토큰이 기존 등록과 겹쳤습니다. 보안을 위해 기존 등록을 자동으로 넘겨받지 않으므로 지원이 필요합니다.",
        "duplicate_registration",
        response.status
      );
    }
    if (outcome === "registration_disabled") {
      throw new NotificationSetupError(
        "알림 신규 등록이 일시 중단되었습니다. 잠시 후 다시 시도해 주세요.",
        "registration_disabled",
        response.status
      );
    }
    if (outcome === "sensitive_interest_consent_required") {
      throw new NotificationSetupError(
        "만 14세 이상 확인과 현재 알림 정보 처리 동의가 필요합니다.",
        "sensitive_interest_consent_required",
        response.status
      );
    }
    throw new NotificationSetupError(
      "알림 서버 요청을 완료하지 못했습니다.",
      "notification_request_failed",
      response.status
    );
  } catch (error) {
    if (error instanceof NotificationSetupError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new NotificationSetupError("알림 서버 응답 시간이 초과됐습니다.");
    }
    throw new NotificationSetupError("네트워크 상태를 확인한 뒤 다시 시도해 주세요.");
  } finally {
    clearTimeout(timeout);
  }
}

async function unregisterRemote(credentials: InstallationCredentials): Promise<void> {
  const material = await installationCredentialMaterial(credentials);
  await dataApiRpcRequest(
    "notification_unregister_v2",
    {
      target_installation_id: credentials.installationId,
      target_app_variant: appVariant()
    },
    { "x-jubilee-installation-proof": material.proof }
  );
}

async function cancelReinstallRecoveryRemote(
  credentials: InstallationCredentials,
  recovery: PendingReinstallRecovery
): Promise<void> {
  const material = await installationCredentialMaterial(credentials);
  const payload = await dataApiRpcRequest(
    "notification_cancel_reinstall_recovery_v1",
    createReinstallRecoveryCancelBody(
      credentials.installationId,
      Platform.OS,
      recovery.appVariant
    ),
    {
      "x-jubilee-installation-proof": material.proof,
      "x-jubilee-expo-push-token": recovery.expoPushToken
    }
  );
  if (!isConfirmedReinstallRecoveryWithdrawal(payload)) {
    throw new NotificationSetupError(
      "알림 연결 해제를 확인하지 못했습니다.",
      "notification_recovery_unlink_unconfirmed"
    );
  }
}

async function completeRemoteNotificationCleanup(
  credentials: InstallationCredentials
): Promise<boolean> {
  const reinstallRecovery = await readPendingReinstallRecovery();
  if (reinstallRecovery) {
    if (reinstallRecovery.mode !== "withdrawal") {
      await writePendingReinstallRecovery({
        ...reinstallRecovery,
        recoveryCode: null,
        mode: "withdrawal"
      });
    }
    await cancelReinstallRecoveryRemote(credentials, reinstallRecovery);
  }

  // A persisted recovery record identifies a target that either stayed
  // pending or was atomically unregistered by the cancel RPC. Without that
  // record, also run normal unregister to reconcile an interrupted ordinary
  // registration whose local two-phase state was still pending.
  if (!reinstallRecovery) {
    try {
      await unregisterRemote(credentials);
    } catch (error) {
      if (!isInvalidInstallationError(error)) throw error;
    }
  }
  await clearCredentialsAndPendingIfCurrent(credentials);
  return true;
}

async function reconcilePendingCleanupInternal(): Promise<boolean> {
  const [cleanupPending, credentials] = await Promise.all([
    readCleanupPending(),
    readCredentials()
  ]);
  if (!shouldRetryPendingNotificationCleanup(cleanupPending, Boolean(credentials))) {
    if (cleanupPending && !credentials) {
      await Promise.all([
        clearCleanupPending(),
        clearPendingReinstallRecovery()
      ]);
    }
    return false;
  }

  try {
    if (!await completeRemoteNotificationCleanup(credentials!)) return true;
  } catch {
    return true;
  }
  return false;
}

async function assertCurrentNotificationIntent(
  expectedPreferences: NotificationPreferences,
  expectedConsent: SensitiveInterestConsentRecord
): Promise<void> {
  const [preferences, consent, cleanupPending] = await Promise.all([
    readPreferences(),
    readSensitiveInterestConsent(),
    readCleanupPending()
  ]);
  if (
    cleanupPending ||
    !isCurrentSensitiveInterestConsentRecord(consent) ||
    consent.version !== expectedConsent.version ||
    consent.age14OrOverConfirmed !== expectedConsent.age14OrOverConfirmed ||
    JSON.stringify(preferences) !== JSON.stringify(expectedPreferences) ||
    !Object.values(preferences).some(Boolean)
  ) {
    throw new NotificationSetupError(
      "알림 동의가 철회되었거나 서버 해제가 대기 중입니다.",
      "sensitive_interest_consent_required"
    );
  }
}

async function expoPushToken(
  devicePushToken?: Notifications.DevicePushToken
): Promise<string> {
  if (Platform.OS !== "ios" && Platform.OS !== "android") {
    throw new NotificationSetupError("푸시 알림은 iOS·Android 앱에서 설정할 수 있습니다.");
  }
  if (!Device.isDevice) {
    throw new NotificationSetupError("푸시 알림은 실제 기기에서만 등록할 수 있습니다.");
  }
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("worship-updates", {
      name: "예배 소식",
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: "default",
      vibrationPattern: [0, 250, 150, 250],
      lightColor: "#27658F"
    });
  }

  let permissions = await Notifications.getPermissionsAsync();
  if (permissions.status !== "granted") {
    permissions = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: false, allowSound: true }
    });
  }
  if (permissions.status !== "granted") {
    throw new NotificationSetupError(
      permissions.canAskAgain
        ? "알림 권한이 허용되지 않았습니다."
        : "기기 설정에서 쥬빌리워십 알림을 허용해 주세요."
    );
  }

  const token = await Notifications.getExpoPushTokenAsync({
    projectId: projectId(),
    ...(devicePushToken ? { devicePushToken } : {})
  });
  return token.data;
}

async function requestReinstallRecovery(
  credentials: InstallationCredentials,
  material: InstallationCredentialMaterial,
  preferences: NotificationPreferences,
  token: string,
  consent: SensitiveInterestConsentRecord
): Promise<PendingReinstallRecovery> {
  const variant = appVariant();
  if (variant !== "development" && variant !== "preview") {
    throw new NotificationSetupError(
      "\uC7AC\uC124\uCE58 \uBCF5\uAD6C\uB294 \uAC1C\uBC1C\xB7\uBBF8\uB9AC\uBCF4\uAE30 \uC571\uC5D0\uC11C\uB9CC \uC694\uCCAD\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.",
      "notification_recovery_unavailable"
    );
  }
  const capability = await createReinstallRecoveryCapability();
  // Persist the exact token/code before the RPC. The server returns the
  // authoritative ten-minute expiry; this slightly wider provisional bound
  // covers response loss without making the displayed code long-lived.
  const provisionalRecovery = createProvisionalPendingReinstallRecovery(
    capability.recoveryCode,
    token,
    variant
  );
  try {
    return await persistReinstallRecoveryRequest({
      provisional: provisionalRecovery,
      writePending: writePendingReinstallRecovery,
      request: () => dataApiRpcRequest(
        "notification_request_reinstall_recovery_v1",
        createReinstallRecoveryRequestBody({
          installationId: credentials.installationId,
          secretStoreHash: material.storeHash,
          pairingStoreHash: material.pairingStoreHash,
          platform: Platform.OS,
          appVersion: appVersion(),
          appVariant: variant,
          consentVersion: consent.version,
          disclosureSha256: consent.disclosureSha256,
          consentLocale: consent.locale,
          age14OrOverConfirmed: consent.age14OrOverConfirmed,
          worshipReminder: preferences.worshipReminder,
          scheduleChanges: preferences.scheduleChanges,
          setlistUpdates: preferences.setlistUpdates,
          recoveryCodeDigest: capability.recoveryCodeDigest
        }),
        { "x-jubilee-expo-push-token": token }
      ),
      parseResponse: (payload) => {
        const pending = parsePendingReinstallRecovery(
          payload,
          capability.recoveryCode,
          variant,
          token
        );
        if (!pending) {
          throw new NotificationSetupError(
            "\uC7AC\uC124\uCE58 \uBCF5\uAD6C \uC694\uCCAD\uC744 \uC644\uB8CC\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.",
            "notification_recovery_invalid_response"
          );
        }
        return pending;
      }
    });
  } catch (error) {
    if (
      error instanceof ReinstallRecoveryStorageError
      && error.phase === "provisional"
    ) {
      throw new NotificationSetupError(
        "재설치 복구 정보를 기기 보안 저장소에 먼저 저장하지 못했습니다.",
        "notification_recovery_local_storage_failed"
      );
    }
    throw error;
  }
}

async function finalizeReinstallRecovery(
  credentials: InstallationCredentials,
  recovery: PendingReinstallRecovery,
  preferences: NotificationPreferences,
  consent: SensitiveInterestConsentRecord
): Promise<void> {
  const material = await installationCredentialMaterial(credentials);
  await dataApiRpcRequest(
    "notification_finalize_reinstall_recovery_v1",
    createReinstallRecoveryFinalizeBody({
      installationId: credentials.installationId,
      platform: Platform.OS,
      appVersion: appVersion(),
      appVariant: recovery.appVariant,
      consentVersion: consent.version,
      disclosureSha256: consent.disclosureSha256,
      consentLocale: consent.locale,
      age14OrOverConfirmed: consent.age14OrOverConfirmed,
      worshipReminder: preferences.worshipReminder,
      scheduleChanges: preferences.scheduleChanges,
      setlistUpdates: preferences.setlistUpdates
    }),
    {
      "x-jubilee-installation-proof": material.proof,
      "x-jubilee-expo-push-token": recovery.expoPushToken
    }
  );
}

type InstallationRegistrationResult = {
  credentials: InstallationCredentials;
  reinstallRecovery: PendingReinstallRecovery | null;
};

async function registerInstallation(
  preferences: NotificationPreferences,
  token: string,
  consent: SensitiveInterestConsentRecord
): Promise<InstallationRegistrationResult> {
  const credentials = await createInstallationCredentials();
  const material = await installationCredentialMaterial(credentials);
  await writeCredentials(credentials);
  try {
    await dataApiRpcRequest(
      "notification_register_v2",
      {
        target_installation_id: credentials.installationId,
        target_secret_store_hash: material.storeHash,
        target_pairing_store_hash: material.pairingStoreHash,
        target_platform: Platform.OS,
        target_app_version: appVersion(),
        target_app_variant: appVariant(),
        target_sensitive_interest_consent_version: consent.version,
        target_sensitive_interest_disclosure_sha256:
          consent.disclosureSha256,
        target_sensitive_interest_consent_locale:
          consent.locale,
        target_age_14_or_over_confirmed: consent.age14OrOverConfirmed,
        target_worship_reminder: preferences.worshipReminder,
        target_schedule_changes: preferences.scheduleChanges,
        target_setlist_updates: preferences.setlistUpdates
      },
      { "x-jubilee-expo-push-token": token }
    );
    if (!await markCredentialsCommittedIfCurrent(credentials)) {
      throw new NotificationSetupError(
        "The local installation changed before registration completed.",
        "installation_registration_superseded"
      );
    }
    await clearPendingReinstallRecovery();
    return {
      credentials: { ...credentials, registrationState: "committed" },
      reinstallRecovery: null
    };
  } catch (error) {
    if (
      error instanceof NotificationSetupError
      && error.code === "duplicate_registration"
    ) {
      try {
        return {
          credentials,
          reinstallRecovery: await requestReinstallRecovery(
            credentials,
            material,
            preferences,
            token,
            consent
          )
        };
      } catch (recoveryError) {
        error = recoveryError;
      }
    }
    if (
      error instanceof NotificationSetupError
      && error.code === "notification_recovery_local_storage_failed"
    ) {
      throw error;
    }
    await writeCleanupPending();
    try {
      await completeRemoteNotificationCleanup(credentials);
    } catch {
      // Fail closed; startup retries with the same credentials and any
      // recovery-only token stored in SecureStore.
    }
    throw error;
  }
}

async function updateInstallation(
  credentials: InstallationCredentials,
  preferences: NotificationPreferences,
  token: string | null,
  consent: SensitiveInterestConsentRecord
): Promise<void> {
  const material = await installationCredentialMaterial(credentials);
  await dataApiRpcRequest(
    "notification_update_v2",
    {
      target_installation_id: credentials.installationId,
      target_pairing_store_hash: material.pairingStoreHash,
      target_app_version: appVersion(),
      target_app_variant: appVariant(),
      target_sensitive_interest_consent_version: consent.version,
      target_sensitive_interest_disclosure_sha256:
        consent.disclosureSha256,
      target_sensitive_interest_consent_locale:
        consent.locale,
      target_age_14_or_over_confirmed: consent.age14OrOverConfirmed,
      target_worship_reminder: preferences.worshipReminder,
      target_schedule_changes: preferences.scheduleChanges,
      target_setlist_updates: preferences.setlistUpdates
    },
    {
      "x-jubilee-installation-proof": material.proof,
      ...(token ? { "x-jubilee-expo-push-token": token } : {})
    }
  );
}

async function reconcileIncompleteRegistration(
  credentials: InstallationCredentials,
  preferences: NotificationPreferences,
  consent: SensitiveInterestConsentRecord,
  reinstallRecovery: PendingReinstallRecovery | null
): Promise<{
  credentials: InstallationCredentials | null;
  reinstallRecovery: PendingReinstallRecovery | null;
}> {
  if (credentials.registrationState === "committed" || reinstallRecovery) {
    return { credentials, reinstallRecovery };
  }
  if (Platform.OS !== "ios" && Platform.OS !== "android") {
    return { credentials, reinstallRecovery: null };
  }
  const permission = await Notifications.getPermissionsAsync();
  if (permission.status !== "granted") {
    return { credentials, reinstallRecovery: null };
  }

  const token = await expoPushToken();
  await assertCurrentNotificationIntent(preferences, consent);
  try {
    await updateInstallation(credentials, preferences, token, consent);
    if (!await markCredentialsCommittedIfCurrent(credentials)) {
      return { credentials: null, reinstallRecovery: null };
    }
    return {
      credentials: { ...credentials, registrationState: "committed" },
      reinstallRecovery: null
    };
  } catch (error) {
    if (!isInvalidInstallationError(error)) throw error;
  }

  await clearCredentialsIfCurrent(credentials);
  await assertCurrentNotificationIntent(preferences, consent);
  const registration = await registerInstallation(preferences, token, consent);
  return registration;
}

async function loadNotificationPreferencesInternal(): Promise<{
  preferences: NotificationPreferences;
  registered: boolean;
  consented: boolean;
  permission: Notifications.PermissionStatus | "unsupported";
  reinstallRecovery: PendingReinstallRecovery | null;
}> {
  const cleanupStillPending = await reconcilePendingCleanupInternal();
  if (cleanupStillPending) {
    const pendingCleanupRecovery = await readPendingReinstallRecovery();
    await Promise.all([
      clearSensitiveInterestConsent(),
      AsyncStorage.setItem(
        PREFERENCES_KEY,
        JSON.stringify(DEFAULT_NOTIFICATION_PREFERENCES)
      )
    ]);
    if (Platform.OS !== "ios" && Platform.OS !== "android") {
      return {
        preferences: DEFAULT_NOTIFICATION_PREFERENCES,
        registered: false,
        consented: false,
        permission: "unsupported",
        reinstallRecovery: pendingCleanupRecovery
      };
    }
    return {
      preferences: DEFAULT_NOTIFICATION_PREFERENCES,
      registered: false,
      consented: false,
      permission: (await Notifications.getPermissionsAsync()).status,
      reinstallRecovery: pendingCleanupRecovery
    };
  }
  let [storedPreferences, credentials, storedConsent, reinstallRecovery] = await Promise.all([
    readPreferences(),
    readCredentials(),
    readSensitiveInterestConsent(),
    readPendingReinstallRecovery()
  ]);
  let consented = isCurrentSensitiveInterestConsentRecord(storedConsent);
  let preferences = consented ? storedPreferences : DEFAULT_NOTIFICATION_PREFERENCES;
  const wantsNotifications = Object.values(storedPreferences).some(Boolean);
  if (
    shouldFailClosedNotificationState(
      consented,
      Boolean(credentials),
      wantsNotifications
    )
  ) {
    await unregisterNotificationsInternal();
    storedPreferences = DEFAULT_NOTIFICATION_PREFERENCES;
    storedConsent = null;
    credentials = null;
    reinstallRecovery = null;
    consented = false;
    preferences = DEFAULT_NOTIFICATION_PREFERENCES;
  }
  if (
    credentials
    && isCurrentSensitiveInterestConsentRecord(storedConsent)
    && Object.values(storedPreferences).some(Boolean)
  ) {
    const reconciled = await reconcileIncompleteRegistration(
      credentials,
      storedPreferences,
      storedConsent,
      reinstallRecovery
    );
    credentials = reconciled.credentials;
    reinstallRecovery = reconciled.reinstallRecovery;
  }
  if (!consented && credentials) {
    await writeCleanupPending();
    try {
      if (await completeRemoteNotificationCleanup(credentials)) {
        credentials = null;
        reinstallRecovery = null;
      }
    } catch {
      reinstallRecovery = await readPendingReinstallRecovery();
    }
  }
  if (!consented) {
    await Promise.all([
      clearSensitiveInterestConsent(),
      ...(!credentials ? [clearPendingReinstallRecovery()] : []),
      AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(DEFAULT_NOTIFICATION_PREFERENCES))
    ]);
    if (!credentials) reinstallRecovery = null;
  }
  if (reinstallRecovery && !credentials) {
    await clearPendingReinstallRecovery();
    reinstallRecovery = null;
  }
  const cleanupPending = await readCleanupPending();
  const registered = shouldReportNotificationRegistered({
    hasCurrentConsent: consented,
    wantsNotifications: Object.values(preferences).some(Boolean),
    hasCredentials: Boolean(credentials),
    registrationCommitted: credentials?.registrationState === "committed",
    hasReinstallRecovery: Boolean(reinstallRecovery),
    cleanupPending
  });
  if (Platform.OS !== "ios" && Platform.OS !== "android") {
    return {
      preferences,
      registered: false,
      consented: false,
      permission: "unsupported",
      reinstallRecovery: null
    };
  }
  const permission = (await Notifications.getPermissionsAsync()).status;
  return { preferences, registered, consented, permission, reinstallRecovery };
}

export function loadNotificationPreferences(): Promise<{
  preferences: NotificationPreferences;
  registered: boolean;
  consented: boolean;
  permission: Notifications.PermissionStatus | "unsupported";
  reinstallRecovery: PendingReinstallRecovery | null;
}> {
  return enqueueNotificationMutation(loadNotificationPreferencesInternal);
}

export function scrubExpiredPendingReinstallRecovery(): Promise<PendingReinstallRecovery | null> {
  return enqueueNotificationMutation(readPendingReinstallRecovery);
}

async function performRegisteredNotificationTokenRefresh(
  devicePushToken?: Notifications.DevicePushToken
): Promise<void> {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return;
  if (await reconcilePendingCleanupInternal()) return;
  const [preferences, storedConsent, reinstallRecovery] = await Promise.all([
    readPreferences(),
    readSensitiveInterestConsent(),
    readPendingReinstallRecovery()
  ]);
  if (!isCurrentSensitiveInterestConsentRecord(storedConsent)) {
    await unregisterNotificationsInternal();
    return;
  }
  if (!Object.values(preferences).some(Boolean)) {
    await unregisterNotificationsInternal();
    return;
  }
  if (reinstallRecovery) return;
  const permissions = await Notifications.getPermissionsAsync();
  if (permissions.status !== "granted") return;

  const token = await expoPushToken(devicePushToken);
  await assertCurrentNotificationIntent(preferences, storedConsent);
  const credentials = await readCredentials();
  if (!credentials) {
    await assertCurrentNotificationIntent(preferences, storedConsent);
    await registerInstallation(preferences, token, storedConsent);
    return;
  }
  try {
    await updateInstallation(credentials, preferences, token, storedConsent);
    await markCredentialsCommittedIfCurrent(credentials);
  } catch (error) {
    if (!isInvalidInstallationError(error)) throw error;
    await clearCredentialsIfCurrent(credentials);
    await assertCurrentNotificationIntent(preferences, storedConsent);
    await registerInstallation(preferences, token, storedConsent);
  }
}

export function refreshRegisteredNotificationToken(
  devicePushToken?: Notifications.DevicePushToken
): Promise<void> {
  return enqueueNotificationMutation(() =>
    performRegisteredNotificationTokenRefresh(devicePushToken)
  );
}

async function syncNotificationPreferencesInternal(
  preferences: NotificationPreferences,
  affirmativeConsent?: SensitiveInterestConsentRecord
): Promise<{
  registered: boolean;
  cleanupPending: boolean;
  reinstallRecovery: PendingReinstallRecovery | null;
}> {
  const wantsNotifications = Object.values(preferences).some(Boolean);
  const cleanupStillPending = await reconcilePendingCleanupInternal();
  let [credentials, reinstallRecovery] = await Promise.all([
    readCredentials(),
    readPendingReinstallRecovery()
  ]);
  if (wantsNotifications && cleanupStillPending) {
    throw new NotificationSetupError(
      "이전 알림 등록 해제를 재시도한 뒤 다시 켜 주세요.",
      "notification_cleanup_pending"
    );
  }

  if (!wantsNotifications) {
    await Promise.all([
      clearSensitiveInterestConsent(),
      AsyncStorage.setItem(
        PREFERENCES_KEY,
        JSON.stringify(DEFAULT_NOTIFICATION_PREFERENCES)
      ),
      ...(credentials
        ? [writeCleanupPending()]
        : [clearCleanupPending(), clearPendingReinstallRecovery()])
    ]);
    if (credentials) {
      try {
        if (!await completeRemoteNotificationCleanup(credentials)) {
          return {
            registered: false,
            cleanupPending: true,
            reinstallRecovery: await readPendingReinstallRecovery()
          };
        }
      } catch {
        return {
          registered: false,
          cleanupPending: true,
          reinstallRecovery: await readPendingReinstallRecovery()
        };
      }
    }
    return {
      registered: false,
      cleanupPending: false,
      reinstallRecovery: null
    };
  }

  const storedConsent = await readSensitiveInterestConsent();
  const consent = isCurrentSensitiveInterestConsentRecord(affirmativeConsent)
    ? CURRENT_SENSITIVE_INTEREST_CONSENT_RECORD
    : storedConsent;
  if (!isCurrentSensitiveInterestConsentRecord(consent)) {
    throw new NotificationSetupError(
      "만 14세 이상 확인 후 종교적 관심을 드러낼 수 있는 알림 정보 처리에 별도 동의해 주세요.",
      "sensitive_interest_consent_required"
    );
  }

  try {
    await Promise.all([
      writeSensitiveInterestConsent(),
      clearCleanupPending(),
      AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences))
    ]);
  } catch {
    await Promise.all([
      clearSensitiveInterestConsent(),
      AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(DEFAULT_NOTIFICATION_PREFERENCES))
    ]);
    throw new NotificationSetupError(
      "기기에 알림 동의 상태를 안전하게 저장하지 못했습니다.",
      "local_consent_storage_failed"
    );
  }

  if (credentials && reinstallRecovery) {
    if (reinstallRecovery.mode === "withdrawal") {
      await writeCleanupPending();
      throw new NotificationSetupError(
        "이전 알림 연결 해제를 완료한 뒤 다시 켜 주세요.",
        "notification_cleanup_pending"
      );
    }
    await assertCurrentNotificationIntent(preferences, consent);
    try {
      await finalizeReinstallRecovery(
        credentials,
        reinstallRecovery,
        preferences,
        consent
      );
      if (!await markCredentialsCommittedIfCurrent(credentials)) {
        throw new NotificationSetupError(
          "The local installation changed before recovery completed.",
          "installation_registration_superseded"
        );
      }
      await clearPendingReinstallRecovery();
      return {
        registered: true,
        cleanupPending: false,
        reinstallRecovery: null
      };
    } catch (error) {
      const isAwaitingOwner = error instanceof NotificationSetupError
        && [
          "notification_recovery_not_authorized",
          "notification_recovery_expired",
          "notification_recovery_not_available"
        ].includes(error.code);
      if (!isAwaitingOwner) throw error;
      if (reinstallRecoveryRemainingMs(reinstallRecovery) > 0) {
        return {
          registered: false,
          cleanupPending: false,
          reinstallRecovery
        };
      }
    }
    const renewed = await requestReinstallRecovery(
      credentials,
      await installationCredentialMaterial(credentials),
      preferences,
      reinstallRecovery.expoPushToken,
      consent
    );
    return {
      registered: false,
      cleanupPending: false,
      reinstallRecovery: renewed
    };
  }

  try {
    const token = await expoPushToken();
    await assertCurrentNotificationIntent(preferences, consent);
    if (!credentials) {
      const registration = await registerInstallation(preferences, token, consent);
      if (registration.reinstallRecovery) {
        return {
          registered: false,
          cleanupPending: false,
          reinstallRecovery: registration.reinstallRecovery
        };
      }
    } else {
      try {
        await updateInstallation(credentials, preferences, token, consent);
        if (!await markCredentialsCommittedIfCurrent(credentials)) {
          throw new NotificationSetupError(
            "The local installation changed before registration completed.",
            "installation_registration_superseded"
          );
        }
        await clearPendingReinstallRecovery();
      } catch (error) {
        if (!isInvalidInstallationError(error)) throw error;
        await clearCredentialsIfCurrent(credentials);
        await assertCurrentNotificationIntent(preferences, consent);
        const registration = await registerInstallation(preferences, token, consent);
        if (registration.reinstallRecovery) {
          return {
            registered: false,
            cleanupPending: false,
            reinstallRecovery: registration.reinstallRecovery
          };
        }
      }
    }
  } catch (error) {
    if (
      error instanceof NotificationSetupError
      && error.code === "notification_recovery_local_storage_failed"
    ) {
      throw error;
    }
    const activeCredentials = await readCredentials();
    await Promise.all([
      clearSensitiveInterestConsent(),
      AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(DEFAULT_NOTIFICATION_PREFERENCES)),
      ...(activeCredentials ? [writeCleanupPending()] : [clearCleanupPending()])
    ]);
    if (activeCredentials) {
      try {
        await completeRemoteNotificationCleanup(activeCredentials);
      } catch {
        // The cleanup marker, credentials, and any recovery token/code remain
        // in SecureStore so startup can retry the privacy withdrawal.
      }
    }
    throw error;
  }
  return {
    registered: true,
    cleanupPending: false,
    reinstallRecovery: null
  };
}

export function syncNotificationPreferences(
  preferences: NotificationPreferences,
  affirmativeConsent?: SensitiveInterestConsentRecord
): Promise<{
  registered: boolean;
  cleanupPending: boolean;
  reinstallRecovery: PendingReinstallRecovery | null;
}> {
  return enqueueNotificationMutation(() =>
    syncNotificationPreferencesInternal(preferences, affirmativeConsent)
  );
}

async function unregisterNotificationsInternal(): Promise<{ cleanupPending: boolean }> {
  const credentials = await readCredentials();
  await Promise.all([
    clearSensitiveInterestConsent(),
    AsyncStorage.setItem(
      PREFERENCES_KEY,
      JSON.stringify(DEFAULT_NOTIFICATION_PREFERENCES)
    ),
    ...(credentials
      ? [writeCleanupPending()]
      : [clearCleanupPending(), clearPendingReinstallRecovery()])
  ]);
  if (credentials) {
    try {
      if (!await completeRemoteNotificationCleanup(credentials)) {
        return { cleanupPending: true };
      }
    } catch {
      return { cleanupPending: true };
    }
  }
  return { cleanupPending: false };
}

export function unregisterNotifications(): Promise<{ cleanupPending: boolean }> {
  return enqueueNotificationMutation(unregisterNotificationsInternal);
}

async function createTestPushPairingCodeInternal(): Promise<TestPushPairingCode> {
  if (await reconcilePendingCleanupInternal()) {
    throw new NotificationSetupError("이전 알림 등록 해제가 대기 중입니다.");
  }
  const variant = appVariant();
  if (!isTestPushPairingVariant(variant)) {
    throw new NotificationSetupError("운영 앱은 시험 기기로 연결할 수 없습니다.");
  }

  const credentials = await readCredentials();
  if (!credentials) {
    throw new NotificationSetupError("알림을 먼저 허용해 이 기기를 등록해 주세요.");
  }

  try {
    const material = await installationCredentialMaterial(credentials);
    const response = await functionRequest<unknown>("create-test-push-pairing", {
      installationId: credentials.installationId,
      pairingProof: material.pairingProof,
      appVariant: variant
    });
    const pairing = parseTestPushPairingCode(response, variant);
    if (!pairing) {
      throw new NotificationSetupError("시험 기기 연결정보 응답이 올바르지 않습니다.");
    }
    return pairing;
  } catch (error) {
    if (isInvalidInstallationError(error)) {
      await clearCredentialsIfCurrent(credentials);
    }
    throw error;
  }
}

export function createTestPushPairingCode(): Promise<TestPushPairingCode> {
  return enqueueNotificationMutation(createTestPushPairingCodeInternal);
}

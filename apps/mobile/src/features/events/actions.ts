import type { MobilePublicEvent } from "@jubilee/domain";
import * as Calendar from "expo-calendar/legacy";
import * as Linking from "expo-linking";
import { Alert, Platform, Share } from "react-native";

import { createAppDeepLink } from "@/features/links/current-app-deep-link";

async function openExternalUrl(url: string): Promise<void> {
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) throw new Error("unsupported");
    await Linking.openURL(url);
  } catch {
    Alert.alert("링크를 열 수 없습니다", "잠시 후 다시 시도해 주세요.");
  }
}

export function requiresLegacyIosCalendarPermission(
  platform: string,
  version: string | number
): boolean {
  if (platform !== "ios") return false;
  const majorVersion = Number.parseInt(String(version), 10);
  return Number.isFinite(majorVersion) && majorVersion < 17;
}

export async function addEventToCalendar(event: MobilePublicEvent): Promise<void> {
  try {
    if (requiresLegacyIosCalendarPermission(Platform.OS, Platform.Version)) {
      const currentPermission = await Calendar.getCalendarPermissionsAsync();
      const permission = currentPermission.granted
        ? currentPermission
        : await Calendar.requestCalendarPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "캘린더 권한이 필요합니다",
          "iOS 16에서 일정 추가 화면을 열려면 캘린더 권한을 허용해야 합니다. 앱은 기존 일정을 읽거나 서버로 전송하지 않습니다."
        );
        return;
      }
    }

    const startDate = new Date(event.starts_at);
    const endDate = event.ends_at ? new Date(event.ends_at) : new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
    const details = {
      title: event.title,
      startDate,
      endDate,
      location: `${event.venue_name} · ${event.address}`,
      notes: event.description ?? "쥬빌리워십 예배"
    };

    await Calendar.createEventInCalendarAsync(details);
  } catch {
    Alert.alert("일정을 추가하지 못했습니다", "캘린더 앱을 확인한 뒤 다시 시도해 주세요.");
  }
}

export function openMapChoices(event: MobilePublicEvent, naverUrl: string, kakaoUrl: string) {
  const query = encodeURIComponent(`${event.venue_name} ${event.address}`);
  const defaultMapUrl = Platform.OS === "ios"
    ? `https://maps.apple.com/?q=${query}`
    : `geo:0,0?q=${query}`;
  Alert.alert("길찾기", event.venue_name, [
    { text: "취소", style: "cancel" },
    { text: "기본 지도", onPress: () => void openExternalUrl(defaultMapUrl) },
    { text: "네이버 지도", onPress: () => void openExternalUrl(naverUrl) },
    { text: "카카오맵", onPress: () => void openExternalUrl(kakaoUrl) }
  ]);
}

export async function shareEvent(event: MobilePublicEvent): Promise<void> {
  try {
    const formattedDate = new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      dateStyle: "long",
      timeStyle: "short"
    }).format(new Date(event.starts_at));
    const webOrigin = process.env.EXPO_PUBLIC_WEB_ORIGIN?.replace(/\/$/, "");
    const webUrl = webOrigin ? `${webOrigin}/worship` : null;
    const appUrl = createAppDeepLink(`worship/${event.slug}`);
    await Share.share({
      title: event.title,
      message: [event.title, formattedDate, event.venue_name, webUrl, appUrl]
        .filter(Boolean)
        .join("\n")
    });
  } catch {
    Alert.alert("공유하지 못했습니다", "잠시 후 다시 시도해 주세요.");
  }
}

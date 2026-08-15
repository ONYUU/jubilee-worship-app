import * as Linking from "expo-linking";
import { Alert } from "react-native";

export async function openExternalUrl(url: string): Promise<void> {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") throw new Error("unsupported protocol");
    const supported = await Linking.canOpenURL(url);
    if (!supported) throw new Error("unsupported URL");
    await Linking.openURL(url);
  } catch {
    Alert.alert("링크를 열 수 없습니다", "주소를 확인하거나 잠시 후 다시 시도해 주세요.");
  }
}

export async function openContactEmail(email: string): Promise<void> {
  try {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("invalid email");
    const url = `mailto:${email}?subject=${encodeURIComponent("쥬빌리워십 문의")}`;
    const supported = await Linking.canOpenURL(url);
    if (!supported) throw new Error("unsupported URL");
    await Linking.openURL(url);
  } catch {
    Alert.alert(
      "이메일 앱을 열 수 없습니다",
      `문의 주소를 복사해 이메일을 보내 주세요.\n${email}`
    );
  }
}

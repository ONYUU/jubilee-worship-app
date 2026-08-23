import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  addEventToCalendar,
  requiresLegacyIosCalendarPermission
} from "./actions";

const mocks = vi.hoisted(() => ({
  alert: vi.fn(),
  createEvent: vi.fn(),
  getPermission: vi.fn(),
  requestPermission: vi.fn(),
  platform: "ios",
  version: "16.7"
}));

vi.mock("expo-calendar/legacy", () => ({
  createEventInCalendarAsync: mocks.createEvent,
  getCalendarPermissionsAsync: mocks.getPermission,
  requestCalendarPermissionsAsync: mocks.requestPermission
}));

vi.mock("expo-linking", () => ({
  canOpenURL: vi.fn(),
  openURL: vi.fn()
}));

vi.mock("react-native", () => ({
  Alert: { alert: mocks.alert },
  Platform: {
    get OS() {
      return mocks.platform;
    },
    get Version() {
      return mocks.version;
    }
  },
  Share: { share: vi.fn() }
}));

vi.mock("@/features/links/current-app-deep-link", () => ({
  createAppDeepLink: vi.fn(() => "jubileeworship://worship/test")
}));

const event = {
  title: "주일예배",
  starts_at: "2026-08-30T11:00:00+09:00",
  ends_at: "2026-08-30T13:00:00+09:00",
  venue_name: "선두교회",
  address: "인천",
  description: "예배",
  slug: "sunday-worship"
} as Parameters<typeof addEventToCalendar>[0];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.platform = "ios";
  mocks.version = "16.7";
  mocks.getPermission.mockResolvedValue({ granted: false });
  mocks.requestPermission.mockResolvedValue({ granted: true });
  mocks.createEvent.mockResolvedValue({ action: "saved" });
});

describe("calendar event action", () => {
  it("requests calendar access before opening the editor on iOS 16", async () => {
    await addEventToCalendar(event);

    expect(mocks.getPermission).toHaveBeenCalledOnce();
    expect(mocks.requestPermission).toHaveBeenCalledOnce();
    expect(mocks.createEvent).toHaveBeenCalledOnce();
  });

  it("does not open the editor when the iOS 16 permission is denied", async () => {
    mocks.requestPermission.mockResolvedValue({ granted: false });

    await addEventToCalendar(event);

    expect(mocks.createEvent).not.toHaveBeenCalled();
    expect(mocks.alert).toHaveBeenCalledWith(
      "캘린더 권한이 필요합니다",
      expect.stringContaining("기존 일정을 읽거나 서버로 전송하지 않습니다")
    );
  });

  it("opens the editor without calendar permission on iOS 17 and Android", async () => {
    mocks.version = "17.0";
    await addEventToCalendar(event);
    mocks.platform = "android";
    mocks.version = "36";
    await addEventToCalendar(event);

    expect(mocks.getPermission).not.toHaveBeenCalled();
    expect(mocks.requestPermission).not.toHaveBeenCalled();
    expect(mocks.createEvent).toHaveBeenCalledTimes(2);
  });

  it("detects only supported legacy iOS versions", () => {
    expect(requiresLegacyIosCalendarPermission("ios", "16.7")).toBe(true);
    expect(requiresLegacyIosCalendarPermission("ios", "17.0")).toBe(false);
    expect(requiresLegacyIosCalendarPermission("android", 16)).toBe(false);
  });
});

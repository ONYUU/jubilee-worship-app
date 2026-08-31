import { assertEquals } from "jsr:@std/assert@1";
import {
  createExpoMessage,
  JUBILEE_ANDROID_NOTIFICATION_CHANNEL_ID,
  JUBILEE_PUSH_TTL_SECONDS,
} from "./expo.ts";

Deno.test("generic push messages carry the bounded one-hour TTL", () => {
  assertEquals(JUBILEE_PUSH_TTL_SECONDS, 3_600);
  assertEquals(
    createExpoMessage({
      to: "ExpoPushToken[ttl_test]",
      title: "예배 알림",
      body: "예배 시간을 확인해 주세요.",
      deepLink: "jubileeworship://worship/1",
    }),
    {
      to: "ExpoPushToken[ttl_test]",
      title: "예배 알림",
      body: "예배 시간을 확인해 주세요.",
      channelId: JUBILEE_ANDROID_NOTIFICATION_CHANNEL_ID,
      sound: "default",
      priority: "high",
      ttl: 3_600,
      data: { url: "jubileeworship://worship/1" },
    },
  );
});

Deno.test("worship reminders carry the event start as absolute expiration", () => {
  const eventStartsAt = "2026-09-04T11:00:00.000Z";
  const message = createExpoMessage({
    to: "ExpoPushToken[deadline_test]",
    title: "예배 1시간 전",
    body: "예배가 곧 시작됩니다.",
    expiresAt: eventStartsAt,
  });
  assertEquals(message.expiration, Date.parse(eventStartsAt) / 1_000);
  assertEquals(message.ttl, undefined);
});

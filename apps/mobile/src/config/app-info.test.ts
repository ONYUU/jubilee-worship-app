import { describe, expect, it } from "vitest";
import { APP_INFO, WORSHIP_REMINDER_COPY } from "./app-info";

describe("public mobile app information", () => {
  it("keeps the confirmed app identity and contact", () => {
    expect(APP_INFO).toEqual({
      appName: "쥬빌리워십",
      operatorName: "쥬빌리 워십",
      contactEmail: "sundoojubileeworship@gmail.com"
    });
  });

  it("states both worship reminder delivery times", () => {
    expect(WORSHIP_REMINDER_COPY.description).toContain("전날 오후 7시 30분");
    expect(WORSHIP_REMINDER_COPY.description).toContain("당일 예배 1시간 전");
  });
});

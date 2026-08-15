import { describe, expect, it } from "vitest";

import { isInvalidInstallationError, NotificationSetupError } from "./errors";

describe("notification request errors", () => {
  it("recognizes a purged or invalid installation credential response", () => {
    expect(
      isInvalidInstallationError(
        new NotificationSetupError("설치 인증정보가 올바르지 않습니다.", "invalid_installation", 401)
      )
    ).toBe(true);
  });

  it("does not treat unrelated setup failures as expired credentials", () => {
    expect(
      isInvalidInstallationError(
        new NotificationSetupError("알림 서버 설정이 필요합니다.", "configuration", 500)
      )
    ).toBe(false);
    expect(isInvalidInstallationError(new Error("네트워크 오류"))).toBe(false);
  });
});

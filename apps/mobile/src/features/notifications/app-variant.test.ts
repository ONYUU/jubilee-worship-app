import { describe, expect, it } from "vitest";

import { NotificationSetupError } from "./errors";
import { resolveNotificationAppVariant } from "./app-variant";

describe("resolveNotificationAppVariant", () => {
  it.each(["development", "preview", "production"] as const)(
    "accepts the configured %s build variant",
    (appVariant) => {
      expect(resolveNotificationAppVariant({ appVariant })).toBe(appVariant);
    }
  );

  it.each([undefined, null, {}, { appVariant: "staging" }, { appVariant: 1 }])(
    "fails closed for an invalid Expo extra value",
    (extra) => {
      expect(() => resolveNotificationAppVariant(extra)).toThrow(NotificationSetupError);
    }
  );
});

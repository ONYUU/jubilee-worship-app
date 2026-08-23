import { describe, expect, it, vi } from "vitest";

import { stopNotificationProviderRegistration } from "./provider-registration";

describe("notification provider registration cleanup", () => {
  it("disables Expo auto-registration before invalidating the native token", async () => {
    const calls: string[] = [];
    const api = {
      setAutoServerRegistrationEnabledAsync: vi.fn(async (enabled: boolean) => {
        calls.push(`auto:${enabled}`);
      }),
      unregisterForNotificationsAsync: vi.fn(async () => {
        calls.push("native:unregister");
      })
    };

    await expect(stopNotificationProviderRegistration(api)).resolves.toBeUndefined();
    expect(calls).toEqual(["auto:false", "native:unregister"]);
  });

  it("still invalidates the native token when disabling auto-registration fails", async () => {
    const autoError = new Error("auto registration unavailable");
    const unregisterForNotificationsAsync = vi.fn(async () => undefined);

    await expect(stopNotificationProviderRegistration({
      setAutoServerRegistrationEnabledAsync: vi.fn(async () => {
        throw autoError;
      }),
      unregisterForNotificationsAsync
    })).rejects.toBe(autoError);

    expect(unregisterForNotificationsAsync).toHaveBeenCalledOnce();
  });

  it("reports native-token invalidation failure after auto-registration is disabled", async () => {
    const nativeError = new Error("native unregister unavailable");

    await expect(stopNotificationProviderRegistration({
      setAutoServerRegistrationEnabledAsync: vi.fn(async () => undefined),
      unregisterForNotificationsAsync: vi.fn(async () => {
        throw nativeError;
      })
    })).rejects.toBe(nativeError);
  });
});

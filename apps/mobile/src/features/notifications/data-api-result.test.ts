import { describe, expect, it } from "vitest";

import { classifyNotificationDataApiResult } from "./data-api-result";

describe("notification Data API typed result", () => {
  it.each([
    [200, true, { status: "ok" }, "ok"],
    [200, true, { status: "error", code: "28000" }, "invalid_installation"],
    [200, true, { status: "error", code: "23505" }, "duplicate_registration"],
    [200, true, { status: "error", code: "REGISTRATION_DISABLED" }, "registration_disabled"],
    [200, true, { status: "error", code: "23514" }, "sensitive_interest_consent_required"],
    [500, false, { code: "55000" }, "rate_limited"],
    [429, false, null, "rate_limited"],
    [204, true, null, "request_failed"],
    [200, true, { status: "unexpected" }, "request_failed"]
  ] as const)(
    "maps HTTP %s with %j to %s",
    (httpStatus, responseOk, payload, expected) => {
      expect(classifyNotificationDataApiResult(httpStatus, responseOk, payload)).toBe(expected);
    }
  );
});

import { describe, expect, it } from "vitest";
import { contactMailto, SERVICE_IDENTITY, WORSHIP_REMINDER_SCHEDULE } from "./site-identity";

describe("confirmed service identity", () => {
  it("uses the approved operator and public privacy contact", () => {
    expect(SERVICE_IDENTITY).toEqual({
      operatorName: "쥬빌리 워십",
      contactEmail: "sundoojubileeworship@gmail.com"
    });
    expect(contactMailto()).toBe("mailto:sundoojubileeworship@gmail.com");
  });

  it("keeps both approved worship reminder moments explicit", () => {
    expect(WORSHIP_REMINDER_SCHEDULE.dayBeforeLocalTime).toBe("19:30");
    expect(WORSHIP_REMINDER_SCHEDULE.oneHourBeforeOffsetMinutes).toBe(60);
  });
});

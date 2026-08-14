import { describe, expect, it } from "vitest";
import {
  adminInviteSchema,
  adminPasswordSchema,
  adminRoleSchema,
  adminUserIdSchema
} from "./admin-user-schemas";

describe("admin user schemas", () => {
  it("normalizes valid invitation emails", () => {
    const result = adminInviteSchema.parse({ email: "  TEAM@EXAMPLE.COM " });
    expect(result.email).toBe("team@example.com");
    expect(adminInviteSchema.safeParse({ email: "invalid" }).success).toBe(false);
  });

  it("requires a matching password of at least twelve characters", () => {
    expect(
      adminPasswordSchema.safeParse({
        password: "a-secure-passphrase",
        password_confirmation: "a-secure-passphrase"
      }).success
    ).toBe(true);
    expect(
      adminPasswordSchema.safeParse({
        password: "short",
        password_confirmation: "different"
      }).success
    ).toBe(false);
  });

  it("accepts only UUID user ids and supported roles", () => {
    expect(adminUserIdSchema.safeParse("11111111-1111-4111-8111-111111111111").success).toBe(true);
    expect(adminUserIdSchema.safeParse("1").success).toBe(false);
    expect(adminRoleSchema.safeParse("owner").success).toBe(true);
    expect(adminRoleSchema.safeParse("viewer").success).toBe(false);
  });
});

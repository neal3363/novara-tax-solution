import { scryptSync, randomBytes } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { authenticatePassword, isPasswordAuthConfigured } from "@/lib/auth/session";

function hash(password: string): string {
  const salt = randomBytes(16);
  const digest = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${salt.toString("base64url")}$${digest.toString("base64url")}`;
}

describe("per-user password authentication", () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = "unit-test-auth-secret-32chars-minimum!!";
    process.env.AUTH_MODE = "password";
    process.env.AUTH_USERS_JSON = JSON.stringify([
      {
        id: "usr_exec_001",
        name: "Exec",
        email: "executive@novara.preview",
        role: "executive",
        organizationId: "org_novara",
        organizationName: "NOVARA",
        territories: ["US"],
        mfaRequired: true,
        passwordHash: hash("exec-password-one"),
        totpSecret: "JBSWY3DPEHPK3PXP",
      },
      {
        id: "usr_partner_014",
        name: "Partner",
        email: "partner@novara.preview",
        role: "partner",
        organizationId: "org_partner_tx_01",
        organizationName: "Partner Co",
        territories: ["TX"],
        mfaRequired: true,
        passwordHash: hash("partner-password-two"),
        totpSecret: "JBSWY3DPEHPK3PXP",
      },
    ]);
  });

  it("authenticates each user with their own password only", () => {
    expect(authenticatePassword("executive@novara.preview", "exec-password-one")?.session.role).toBe(
      "executive",
    );
    expect(authenticatePassword("executive@novara.preview", "partner-password-two")).toBeNull();
    expect(authenticatePassword("partner@novara.preview", "partner-password-two")?.session.role).toBe(
      "partner",
    );
  });

  it("fails closed when auth configuration is missing", () => {
    delete process.env.AUTH_USERS_JSON;
    expect(isPasswordAuthConfigured()).toBe(false);
    expect(authenticatePassword("executive@novara.preview", "exec-password-one")).toBeNull();
  });
});

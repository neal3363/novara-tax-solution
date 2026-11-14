import { scryptSync, randomBytes } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import {
  isAuthConfigured,
  isOidcConfigured,
  isPasswordAuthConfigured,
} from "@/lib/auth/session";
import { getOidcConfig } from "@/lib/auth/oidc";

function hash(password: string): string {
  const salt = randomBytes(16);
  const digest = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${salt.toString("base64url")}$${digest.toString("base64url")}`;
}

const roster = JSON.stringify([
  {
    id: "usr_exec_001",
    name: "Exec",
    email: "executive@novara.preview",
    role: "executive",
    organizationId: "org_novara",
    organizationName: "NOVARA",
    territories: ["US"],
    mfaRequired: true,
    passwordHash: hash("x"),
    totpSecret: "JBSWY3DPEHPK3PXP",
  },
]);

describe("auth fails closed without required configuration", () => {
  afterEach(() => {
    delete process.env.AUTH_SECRET;
    delete process.env.AUTH_MODE;
    delete process.env.AUTH_USERS_JSON;
    delete process.env.AUTH_OIDC_ISSUER;
    delete process.env.AUTH_OIDC_CLIENT_ID;
    delete process.env.AUTH_OIDC_CLIENT_SECRET;
    delete process.env.AUTH_OIDC_REDIRECT_URI;
  });

  it("rejects password mode without secret or roster", () => {
    process.env.AUTH_MODE = "password";
    expect(isPasswordAuthConfigured()).toBe(false);
    expect(isAuthConfigured()).toBe(false);
  });

  it("rejects OIDC without issuer/client/secret/redirect/roster", () => {
    process.env.AUTH_SECRET = "unit-test-auth-secret-32chars-minimum!!";
    process.env.AUTH_MODE = "oidc";
    process.env.AUTH_USERS_JSON = roster;
    process.env.AUTH_OIDC_ISSUER = "https://idp.example.com";
    process.env.AUTH_OIDC_CLIENT_ID = "client";
    process.env.AUTH_OIDC_CLIENT_SECRET = "secret";
    // missing redirect
    expect(isOidcConfigured()).toBe(false);

    process.env.AUTH_OIDC_REDIRECT_URI =
      "https://novara-asset-intelligence.apps.grok.bot/api/auth/oidc/callback";
    expect(isOidcConfigured()).toBe(true);
    expect(getOidcConfig()?.redirectUri).toContain("/api/auth/oidc/callback");
  });

  it("rejects OIDC when roster is empty (no privileged self-registration)", () => {
    process.env.AUTH_SECRET = "unit-test-auth-secret-32chars-minimum!!";
    process.env.AUTH_MODE = "oidc";
    process.env.AUTH_USERS_JSON = "[]";
    process.env.AUTH_OIDC_ISSUER = "https://idp.example.com";
    process.env.AUTH_OIDC_CLIENT_ID = "client";
    process.env.AUTH_OIDC_CLIENT_SECRET = "secret";
    process.env.AUTH_OIDC_REDIRECT_URI = "http://localhost:3000/api/auth/oidc/callback";
    expect(isOidcConfigured()).toBe(false);
  });
});

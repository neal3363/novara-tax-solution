import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  createOidcNonce,
  createOidcState,
  createPkcePair,
  getOidcConfig,
  oidcAssertsMfa,
} from "@/lib/auth/oidc";

describe("OIDC helpers", () => {
  it("creates PKCE verifier/challenge pairs (S256)", () => {
    const pair = createPkcePair();
    expect(pair.verifier.length).toBeGreaterThan(20);
    expect(pair.challenge).toBe(
      createHash("sha256").update(pair.verifier).digest("base64url"),
    );
  });

  it("creates unguessable state and nonce", () => {
    expect(createOidcState()).not.toEqual(createOidcState());
    expect(createOidcNonce()).not.toEqual(createOidcNonce());
  });

  it("requires MFA assertions in claims", () => {
    expect(oidcAssertsMfa({ amr: ["pwd"] })).toBe(false);
    expect(oidcAssertsMfa({ amr: ["mfa"] })).toBe(true);
    expect(oidcAssertsMfa({ amr: ["otp"] })).toBe(true);
    expect(oidcAssertsMfa({ acr: "mfa" })).toBe(true);
    expect(oidcAssertsMfa({ mfa: true })).toBe(true);
  });

  it("returns null config when OIDC secrets are missing", () => {
    const prev = {
      issuer: process.env.AUTH_OIDC_ISSUER,
      id: process.env.AUTH_OIDC_CLIENT_ID,
      secret: process.env.AUTH_OIDC_CLIENT_SECRET,
    };
    delete process.env.AUTH_OIDC_ISSUER;
    delete process.env.AUTH_OIDC_CLIENT_ID;
    delete process.env.AUTH_OIDC_CLIENT_SECRET;
    expect(getOidcConfig()).toBeNull();
    process.env.AUTH_OIDC_ISSUER = prev.issuer;
    process.env.AUTH_OIDC_CLIENT_ID = prev.id;
    process.env.AUTH_OIDC_CLIENT_SECRET = prev.secret;
  });
});

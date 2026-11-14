import { describe, expect, it } from "vitest";
import { encodeSession, decodeSession } from "@/lib/auth/cookies";
import { authenticatePassword } from "@/lib/auth/session";
import { canAccessDocument, listVisibleDocuments } from "@/lib/rbac/documents";
import { assertNoCrossPartnerLeak, canViewMasterDiscoveryPool } from "@/lib/rbac/policy";
import { cases, documents, opportunities, previewUsers } from "@/lib/synthetic/data";
import { scryptSync, randomBytes } from "node:crypto";

function hash(password: string): string {
  const salt = randomBytes(16);
  const digest = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${salt.toString("base64url")}$${digest.toString("base64url")}`;
}

describe("security isolation guarantees", () => {
  it("does not allow self-provisioning of privileged roles via password auth roster", () => {
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
        passwordHash: hash("exec-only"),
        totpSecret: "JBSWY3DPEHPK3PXP",
      },
    ]);
    expect(authenticatePassword("attacker@example.com", "exec-only")).toBeNull();
  });

  it("rejects MFA bypass via unsigned mfaVerified cookies", async () => {
    process.env.AUTH_SECRET = "unit-test-auth-secret-32chars-minimum!!";
    process.env.AUTH_SESSION_VERSION = "2";
    const forged = Buffer.from(
      JSON.stringify({
        v: 2,
        role: "executive",
        userId: "usr_exec_001",
        organizationId: "org_novara",
        mfaVerified: true,
        authSource: "password",
        sessionVersion: "2",
        rosterFp: "x",
        issuedAt: new Date().toISOString(),
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).toString("base64url");
    expect(await decodeSession(forged)).toBeNull();
  });

  it("keeps pending MFA sessions marked unverified", async () => {
    process.env.AUTH_SECRET = "unit-test-auth-secret-32chars-minimum!!";
    process.env.AUTH_SESSION_VERSION = "2";
    const token = await encodeSession({
      role: "executive",
      userId: "usr_exec_001",
      organizationId: "org_novara",
      mfaVerified: false,
      authSource: "password",
      rosterFp: "fp",
    });
    const payload = await decodeSession(token);
    expect(payload?.mfaVerified).toBe(false);
  });

  it("blocks cross-partner opportunity and document access", () => {
    const foreign = opportunities.find((o) => o.id === "opp_tx_uc_8841")!;
    expect(assertNoCrossPartnerLeak(previewUsers.partner, foreign)).toBe(false);
    expect(canViewMasterDiscoveryPool(previewUsers.partner)).toBe(false);
    expect(canAccessDocument(previewUsers.attorney, documents[0]!, cases).allowed).toBe(false);
    const attorneyDocs = listVisibleDocuments(previewUsers.attorney, documents, cases);
    expect(attorneyDocs.every((d) => d.authorizedOrganizationIds.includes("org_counsel_tx"))).toBe(
      true,
    );
  });
});

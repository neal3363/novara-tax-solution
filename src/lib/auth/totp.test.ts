import { describe, expect, it } from "vitest";
import { Secret, TOTP } from "otpauth";
import { verifyTotpCode } from "@/lib/auth/totp";

describe("TOTP MFA", () => {
  it("accepts a current authenticator code and rejects a wrong code", () => {
    const secret = Secret.fromBase32("JBSWY3DPEHPK3PXP");
    const totp = new TOTP({ secret, algorithm: "SHA1", digits: 6, period: 30 });
    const code = totp.generate();
    expect(verifyTotpCode(secret.base32, code)).toBe(true);
    expect(verifyTotpCode(secret.base32, "000000")).toBe(false);
  });
});

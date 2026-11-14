import { TOTP, Secret } from "otpauth";

export function verifyTotpCode(secretBase32: string, code: string): boolean {
  const normalized = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(normalized)) return false;
  try {
    const totp = new TOTP({
      secret: Secret.fromBase32(secretBase32),
      algorithm: "SHA1",
      digits: 6,
      period: 30,
    });
    const delta = totp.validate({ token: normalized, window: 1 });
    return delta !== null;
  } catch {
    return false;
  }
}

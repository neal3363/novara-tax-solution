/** Web Crypto helpers safe for Edge middleware and Node route handlers. */

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  const normalized = padded + "=".repeat(padLength);
  const binary = atob(normalized);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signPayload(payload: string, secret: string): Promise<string> {
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  return `${payload}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

export async function verifySignedPayload(
  token: string,
  secret: string,
): Promise<string | null> {
  const splitAt = token.lastIndexOf(".");
  if (splitAt <= 0) return null;
  const payload = token.slice(0, splitAt);
  const signaturePart = token.slice(splitAt + 1);
  if (!payload || !signaturePart) return null;

  try {
    const key = await importHmacKey(secret);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlToBytes(signaturePart),
      new TextEncoder().encode(payload),
    );
    return valid ? payload : null;
  } catch {
    return null;
  }
}

export function getAuthSecret(): string | null {
  const secret = process.env.AUTH_SECRET?.trim();
  return secret && secret.length >= 32 ? secret : null;
}

export function getPreviewAuthPassword(): string | null {
  const password = process.env.PREVIEW_AUTH_PASSWORD?.trim();
  return password && password.length >= 12 ? password : null;
}

export function timingSafeEqualString(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left[i]! ^ right[i]!;
  return diff === 0;
}

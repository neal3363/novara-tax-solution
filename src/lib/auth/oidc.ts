import { createHash, randomBytes } from "node:crypto";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

export type OidcConfig = {
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string;
};

export type OidcDiscovery = {
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  issuer: string;
};

export function getOidcConfig(): OidcConfig | null {
  const issuer = process.env.AUTH_OIDC_ISSUER?.trim();
  const clientId = process.env.AUTH_OIDC_CLIENT_ID?.trim();
  const clientSecret = process.env.AUTH_OIDC_CLIENT_SECRET?.trim();
  const redirectUri =
    process.env.AUTH_OIDC_REDIRECT_URI?.trim() ||
    "http://localhost:3000/api/auth/oidc/callback";
  if (!issuer || !clientId || !clientSecret) return null;
  return {
    issuer: issuer.replace(/\/$/, ""),
    clientId,
    clientSecret,
    redirectUri,
    scopes: process.env.AUTH_OIDC_SCOPES?.trim() || "openid profile email",
  };
}

export async function fetchOidcDiscovery(issuer: string): Promise<OidcDiscovery> {
  const url = `${issuer.replace(/\/$/, "")}/.well-known/openid-configuration`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`OIDC discovery failed (${res.status})`);
  }
  const json = (await res.json()) as Partial<OidcDiscovery>;
  if (
    !json.authorization_endpoint ||
    !json.token_endpoint ||
    !json.jwks_uri ||
    !json.issuer
  ) {
    throw new Error("OIDC discovery document incomplete");
  }
  return json as OidcDiscovery;
}

export function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function createOidcNonce(): string {
  return randomBytes(24).toString("base64url");
}

export function createOidcState(): string {
  return randomBytes(24).toString("base64url");
}

/** IdP must assert MFA via amr/acr before privileged portal access is granted. */
export function oidcAssertsMfa(claims: Record<string, unknown>): boolean {
  const amr = claims.amr;
  if (
    Array.isArray(amr) &&
    amr.some(
      (v) =>
        String(v).toLowerCase().includes("mfa") ||
        String(v).toLowerCase() === "otp" ||
        String(v).toLowerCase() === "mfa",
    )
  ) {
    return true;
  }
  const acr = String(claims.acr ?? "").toLowerCase();
  if (
    acr.includes("mfa") ||
    acr.includes("phr") ||
    acr.includes("http://schemas.openid.net/pape/policies/2007/06/multi-factor")
  ) {
    return true;
  }
  return claims.mfa === true || claims.auth_time_mfa === true;
}

export async function exchangeAuthorizationCode(input: {
  config: OidcConfig;
  discovery: OidcDiscovery;
  code: string;
  codeVerifier: string;
}): Promise<{ id_token: string; access_token?: string }> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: input.config.redirectUri,
    client_id: input.config.clientId,
    client_secret: input.config.clientSecret,
    code_verifier: input.codeVerifier,
  });

  const res = await fetch(input.discovery.token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`OIDC token exchange failed (${res.status})`);
  }
  const json = (await res.json()) as { id_token?: string; access_token?: string };
  if (!json.id_token) throw new Error("OIDC token response missing id_token");
  return { id_token: json.id_token, access_token: json.access_token };
}

export async function verifyIdToken(input: {
  config: OidcConfig;
  discovery: OidcDiscovery;
  idToken: string;
  expectedNonce: string;
}): Promise<JWTPayload> {
  const jwks = createRemoteJWKSet(new URL(input.discovery.jwks_uri));
  const { payload } = await jwtVerify(input.idToken, jwks, {
    issuer: input.discovery.issuer,
    audience: input.config.clientId,
  });

  if (payload.nonce !== input.expectedNonce) {
    throw new Error("OIDC nonce mismatch");
  }
  if (payload.email_verified === false) {
    throw new Error("OIDC email is not verified");
  }
  return payload;
}

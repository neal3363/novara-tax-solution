/**
 * Production IdP (OIDC) configuration surface.
 * Routes fail closed until AUTH_OIDC_* secrets are set and AUTH_MODE includes oidc.
 */

export type OidcConfig = {
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string;
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

/** IdP must assert MFA via amr/acr before privileged portal access is granted. */
export function oidcAssertsMfa(claims: Record<string, unknown>): boolean {
  const amr = claims.amr;
  if (Array.isArray(amr) && amr.some((v) => String(v).toLowerCase().includes("mfa") || String(v).toLowerCase() === "otp")) {
    return true;
  }
  const acr = String(claims.acr ?? "").toLowerCase();
  if (acr.includes("mfa") || acr.includes("phr") || acr.includes("http://schemas.openid.net/pape/policies/2007/06/multi-factor")) {
    return true;
  }
  return claims.mfa === true || claims.auth_time_mfa === true;
}

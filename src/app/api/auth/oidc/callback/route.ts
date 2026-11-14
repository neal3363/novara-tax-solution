import { NextResponse } from "next/server";
import { isOidcConfigured } from "@/lib/auth/session";

/**
 * OIDC callback placeholder.
 * Production wiring exchanges `code` for tokens, validates ID token signature against the IdP JWKS,
 * maps claims → user/role/org, and requires oidcAssertsMfa() before issuing mfaVerified sessions.
 * Remains closed until IdP secrets and claim mapping are configured and implemented for the chosen provider.
 */
export async function GET() {
  if (!isOidcConfigured()) {
    return NextResponse.json(
      { error: "OIDC is not configured" },
      { status: 503 },
    );
  }

  return NextResponse.json(
    {
      error:
        "OIDC callback is prepared but not fully wired to a specific IdP yet. Configure AUTH_OIDC_* and complete token exchange/JWKS validation before enabling production login.",
    },
    { status: 501 },
  );
}

import { NextResponse } from "next/server";
import { getOidcConfig } from "@/lib/auth/oidc";
import { isOidcConfigured } from "@/lib/auth/session";
import { randomBytes } from "node:crypto";

export async function GET() {
  if (!isOidcConfigured()) {
    return NextResponse.json(
      {
        error:
          "OIDC is not configured. Set AUTH_MODE=oidc|both and AUTH_OIDC_ISSUER, AUTH_OIDC_CLIENT_ID, AUTH_OIDC_CLIENT_SECRET.",
      },
      { status: 503 },
    );
  }

  const config = getOidcConfig()!;
  const state = randomBytes(16).toString("hex");
  const url = new URL(`${config.issuer}/authorize`);
  // Generic OIDC authorize endpoint; some IdPs use /.well-known discovery in production wiring.
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", config.scopes);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("acr_values", "mfa");

  const response = NextResponse.redirect(url);
  response.cookies.set("novara_oidc_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return response;
}

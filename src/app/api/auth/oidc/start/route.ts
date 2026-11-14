import { NextResponse } from "next/server";
import {
  createOidcNonce,
  createOidcState,
  createPkcePair,
  fetchOidcDiscovery,
  getOidcConfig,
} from "@/lib/auth/oidc";
import { isOidcConfigured } from "@/lib/auth/session";

export async function GET() {
  if (!isOidcConfigured()) {
    return NextResponse.json(
      {
        error:
          "OIDC is not configured. Set AUTH_MODE=oidc|both and AUTH_OIDC_ISSUER, AUTH_OIDC_CLIENT_ID, AUTH_OIDC_CLIENT_SECRET, AUTH_OIDC_REDIRECT_URI.",
      },
      { status: 503 },
    );
  }

  try {
    const config = getOidcConfig()!;
    const discovery = await fetchOidcDiscovery(config.issuer);
    const state = createOidcState();
    const nonce = createOidcNonce();
    const pkce = createPkcePair();

    const url = new URL(discovery.authorization_endpoint);
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", config.scopes);
    url.searchParams.set("redirect_uri", config.redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("nonce", nonce);
    url.searchParams.set("code_challenge", pkce.challenge);
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("acr_values", "mfa");

    const response = NextResponse.redirect(url.toString());
    const cookieBase = {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 600,
    };
    response.cookies.set("novara_oidc_state", state, cookieBase);
    response.cookies.set("novara_oidc_nonce", nonce, cookieBase);
    response.cookies.set("novara_oidc_verifier", pkce.verifier, cookieBase);
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error: "OIDC authorization start failed",
        detail: error instanceof Error ? error.message : "unknown",
      },
      { status: 503 },
    );
  }
}

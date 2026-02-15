import { NextRequest, NextResponse } from "next/server";
import { createSession, findOrCreateUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  if (error) {
    return NextResponse.redirect(`${baseUrl}?error=auth_denied`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}?error=missing_params`);
  }

  // Validate state
  const storedState = request.cookies.get("x_oauth_state")?.value;
  if (state !== storedState) {
    return NextResponse.redirect(`${baseUrl}?error=invalid_state`);
  }

  const codeVerifier = request.cookies.get("x_code_verifier")?.value;
  if (!codeVerifier) {
    return NextResponse.redirect(`${baseUrl}?error=missing_verifier`);
  }

  try {
    // Exchange code for token
    const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        grant_type: "authorization_code",
        client_id: process.env.X_CLIENT_ID!,
        redirect_uri: `${baseUrl}/api/auth/x/callback`,
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenRes.ok) {
      return NextResponse.redirect(`${baseUrl}?error=token_exchange_failed`);
    }

    const { access_token } = await tokenRes.json();

    // Fetch user profile
    const userRes = await fetch(
      "https://api.twitter.com/2/users/me?user.fields=profile_image_url,name,username",
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    if (!userRes.ok) {
      return NextResponse.redirect(`${baseUrl}?error=profile_fetch_failed`);
    }

    const { data: xUser } = await userRes.json();

    // Create or update user
    const userId = findOrCreateUser({
      xId: xUser.id,
      xUsername: xUser.username,
      xDisplayName: xUser.name,
      xProfileImage: xUser.profile_image_url || "",
    });

    // Create session
    await createSession(userId);

    const response = NextResponse.redirect(`${baseUrl}/profile`);
    response.cookies.delete("x_code_verifier");
    response.cookies.delete("x_oauth_state");
    return response;
  } catch {
    return NextResponse.redirect(`${baseUrl}?error=auth_failed`);
  }
}

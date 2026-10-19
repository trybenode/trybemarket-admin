import { NextResponse } from "next/server";

/**
 * Relays a request from the admin UI to the TrybeMarket web app's CRSA API,
 * forwarding the signed-in admin's own Firebase ID token.
 *
 * Why a relay instead of the browser calling the web app directly: the web
 * app has no CORS, and opening CORS on its production API just for this
 * would be a bigger change than it's worth. A server-to-server call has no
 * CORS at all. All CRSA logic (membership, referral codes, counting,
 * leaderboard) stays in ONE place — the web app's lib/crsaServer.js — and
 * this app never re-implements it.
 *
 * This relay adds no privilege: the web app's own requireAdmin verifies the
 * forwarded token and checks the admins/{uid} collection (the same one this
 * app's login uses), so a non-admin token is refused there with a 403.
 */
export async function relayToWebApp(request, webPath, method) {
  const baseUrl = process.env.NEXT_PUBLIC_WEB_APP_URL;
  if (!baseUrl) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_WEB_APP_URL is not set on the admin server" },
      { status: 500 }
    );
  }

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing authorization token" }, { status: 401 });
  }

  // Optional: if the web app's Vercel project has Deployment Protection on,
  // Vercel's supported way for a server to call it is this bypass header
  // (Project Settings -> Deployment Protection -> Protection Bypass for
  // Automation). Sent only if configured.
  const bypassSecret = process.env.WEB_APP_PROTECTION_BYPASS_SECRET;

  try {
    const response = await fetch(new URL(webPath, baseUrl), {
      method,
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json",
        ...(bypassSecret ? { "x-vercel-protection-bypass": bypassSecret } : {}),
      },
      body: method === "GET" ? undefined : await request.text(),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });

    // A wrong/parked URL often answers 200 with an HTML page — surface that
    // as a clear config error instead of handing the UI something unparseable.
    if (!(response.headers.get("content-type") || "").includes("application/json")) {
      return NextResponse.json(
        { error: `The web app at ${baseUrl} did not return JSON — check NEXT_PUBLIC_WEB_APP_URL` },
        { status: 502 }
      );
    }

    const text = await response.text();

    // Vercel Deployment Protection answers with a JSON 401 that would
    // otherwise be mistaken for "your admin token is invalid".
    try {
      if (JSON.parse(text)?.protection?.vercel_auth_enabled) {
        return NextResponse.json(
          {
            error:
              `The web app at ${baseUrl} is behind Vercel Deployment Protection. Point NEXT_PUBLIC_WEB_APP_URL at an unprotected production domain, ` +
              "or set WEB_APP_PROTECTION_BYPASS_SECRET (Vercel: Project Settings -> Deployment Protection -> Protection Bypass for Automation).",
          },
          { status: 502 }
        );
      }
    } catch {
      // not JSON we can inspect — fall through and relay it as-is
    }

    return new NextResponse(text, {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("CRSA relay error:", error);
    return NextResponse.json({ error: "Could not reach the TrybeMarket web app" }, { status: 502 });
  }
}

/**
 * Relays an IMAGE from the web app (relayToWebApp only passes JSON) — used for
 * private KYC photos, which the web app streams only to admins and logs each
 * view of (kycAccessLog). Same token forwarding and protection bypass as
 * above; the bytes are passed through with no caching.
 */
export async function relayImageFromWebApp(request, webPath) {
  const baseUrl = process.env.NEXT_PUBLIC_WEB_APP_URL;
  if (!baseUrl) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_WEB_APP_URL is not set on the admin server" },
      { status: 500 }
    );
  }

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing authorization token" }, { status: 401 });
  }

  const bypassSecret = process.env.WEB_APP_PROTECTION_BYPASS_SECRET;

  try {
    const response = await fetch(new URL(webPath, baseUrl), {
      headers: {
        Authorization: authorization,
        ...(bypassSecret ? { "x-vercel-protection-bypass": bypassSecret } : {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });

    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || !contentType.startsWith("image/")) {
      // Errors come back as JSON from the web app; anything else is a config problem.
      const body = contentType.includes("application/json")
        ? await response.text()
        : JSON.stringify({ error: `The web app at ${baseUrl} did not return an image (${response.status})` });
      return new NextResponse(body, {
        status: response.ok ? 502 : response.status,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    }

    return new NextResponse(response.body, {
      status: 200,
      headers: { "Content-Type": contentType, "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("KYC photo relay error:", error);
    return NextResponse.json({ error: "Could not reach the TrybeMarket web app" }, { status: 502 });
  }
}

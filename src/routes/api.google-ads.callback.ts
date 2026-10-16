import { createFileRoute } from "@tanstack/react-router";
import { getGoogleAdsConfig, googleAdsRedirectUri, googleCookie, parseGoogleCookies } from "@/lib/google-ads-server";

export const Route = createFileRoute("/api/google-ads/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const config = getGoogleAdsConfig();
        const url = new URL(request.url);
        const origin = url.origin;
        if (!config) return Response.redirect(new URL("/integracoes?google_ads=setup", origin), 302);

        if (url.searchParams.get("error")) {
          const reason = url.searchParams.get("error_description") || url.searchParams.get("error") || "cancelled";
          const target = new URL("/integracoes", origin);
          target.searchParams.set("google_ads", "cancelled");
          target.searchParams.set("google_ads_error", reason.slice(0, 300));
          return Response.redirect(target, 302);
        }

        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const cookies = parseGoogleCookies(request);
        if (!code || !state || !cookies.google_ads_oauth_state || state !== cookies.google_ads_oauth_state) {
          return Response.redirect(new URL("/integracoes?google_ads=state_error", origin), 302);
        }

        try {
          const redirectUri = googleAdsRedirectUri(origin, config);
          const body = new URLSearchParams({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            code,
            grant_type: "authorization_code",
            redirect_uri: redirectUri,
          });
          const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body,
          });
          const tokenJson = await tokenRes.json();
          if (!tokenRes.ok || !tokenJson.access_token) {
            throw new Error(tokenJson?.error_description || tokenJson?.error || "Falha ao obter token do Google");
          }

          const headers = new Headers({
            Location: new URL("/integracoes?google_ads=connected", origin).toString(),
          });
          headers.append("Set-Cookie", googleCookie("google_ads_access_token", String(tokenJson.access_token), Number(tokenJson.expires_in || 3600)));
          if (tokenJson.refresh_token) {
            headers.append("Set-Cookie", googleCookie("google_ads_refresh_token", String(tokenJson.refresh_token), 60 * 60 * 24 * 180));
          }
          headers.append("Set-Cookie", googleCookie("google_ads_oauth_state", "", 0));

          return new Response(null, { status: 302, headers });
        } catch (error) {
          const target = new URL("/integracoes", origin);
          target.searchParams.set("google_ads", "error");
          target.searchParams.set("google_ads_error", error instanceof Error ? error.message.slice(0, 300) : "Falha no OAuth do Google Ads");
          return Response.redirect(target, 302);
        }
      },
    },
  },
});
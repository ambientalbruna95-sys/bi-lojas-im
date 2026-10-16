import { createFileRoute } from "@tanstack/react-router";
import { getGoogleAdsConfig, googleAdsRedirectUri, googleCookie } from "@/lib/google-ads-server";

export const Route = createFileRoute("/api/google-ads/connect")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const config = getGoogleAdsConfig();
        const origin = new URL(request.url).origin;
        if (!config) return Response.redirect(new URL("/integracoes?google_ads=setup", origin), 302);

        const state = crypto.randomUUID();
        const redirectUri = googleAdsRedirectUri(origin, config);
        const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
        url.searchParams.set("client_id", config.clientId);
        url.searchParams.set("redirect_uri", redirectUri);
        url.searchParams.set("response_type", "code");
        url.searchParams.set("state", state);
        url.searchParams.set("access_type", "offline");
        url.searchParams.set("prompt", "consent select_account");
        url.searchParams.set("include_granted_scopes", "true");
        url.searchParams.set("scope", [
          "openid",
          "email",
          "profile",
          "https://www.googleapis.com/auth/adwords",
        ].join(" "));

        return new Response(null, {
          status: 302,
          headers: {
            Location: url.toString(),
            "Set-Cookie": googleCookie("google_ads_oauth_state", state, 600),
          },
        });
      },
    },
  },
});
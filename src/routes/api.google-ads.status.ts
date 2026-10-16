import { createFileRoute } from "@tanstack/react-router";
import {
  explainGoogleAdsError,
  getGoogleAdsConfig,
  getGoogleUser,
  googleAdsRedirectUri,
  googleCookie,
  listAccessibleGoogleAdsCustomers,
  parseGoogleCookies,
  refreshGoogleAccessToken,
} from "@/lib/google-ads-server";

export const Route = createFileRoute("/api/google-ads/status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const config = getGoogleAdsConfig();
        const origin = new URL(request.url).origin;
        const redirectUri = googleAdsRedirectUri(origin, config);
        const clientId = config?.clientId || "";
        const clientIdHint = clientId
          ? `${clientId.slice(0, 12)}…${clientId.slice(-28)}`
          : "";
        const oauthProjectNumber = clientId.match(/^(\d+)-/)?.[1] || "";
        if (!config) {
          return Response.json({ configured: false, connected: false, accounts: [], redirectUri, clientIdHint, oauthProjectNumber, errors: ["Faltam GOOGLE_ADS_CLIENT_ID e/ou GOOGLE_ADS_CLIENT_SECRET no ambiente de produção."] });
        }

        const cookies = parseGoogleCookies(request);
        const refreshToken = cookies.google_ads_refresh_token;
        let accessToken = cookies.google_ads_access_token || "";
        let renewed = false;
        let renewedMaxAge = 3600;

        try {
          if (refreshToken) {
            const refreshed = await refreshGoogleAccessToken(refreshToken, config);
            accessToken = refreshed.accessToken;
            renewed = true;
            renewedMaxAge = refreshed.expiresIn;
          }
          if (!accessToken) {
            return Response.json({ configured: true, connected: false, accounts: [], errors: [] });
          }

          const [accounts, user] = await Promise.all([
            listAccessibleGoogleAdsCustomers(accessToken, config.apiVersion),
            getGoogleUser(accessToken),
          ]);

          const headers = new Headers({ "Content-Type": "application/json" });
          if (renewed) headers.append("Set-Cookie", googleCookie("google_ads_access_token", accessToken, renewedMaxAge));

          return new Response(JSON.stringify({
            configured: true,
            connected: true,
            user,
            accounts,
            apiVersion: config.apiVersion,
            redirectUri,
            clientIdHint,
            oauthProjectNumber,
            errors: [],
          }), { status: 200, headers });
        } catch (error) {
          return Response.json({
            configured: true,
            connected: false,
            accounts: [],
            apiVersion: config.apiVersion,
            redirectUri,
            clientIdHint,
            oauthProjectNumber,
            errors: [explainGoogleAdsError(error instanceof Error ? error.message : String(error))],
          });
        }
      },
    },
  },
});
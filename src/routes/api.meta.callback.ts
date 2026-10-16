import { createFileRoute } from "@tanstack/react-router";
import { cookie, getMetaConfig, parseCookies } from "@/lib/meta-server";

export const Route = createFileRoute("/api/meta/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const config = getMetaConfig();
        const url = new URL(request.url);
        const origin = url.origin;
        if (!config) return Response.redirect(new URL("/integracoes?meta=setup", origin), 302);

        const error = url.searchParams.get("error");
        if (error) return Response.redirect(new URL("/integracoes?meta=cancelled", origin), 302);

        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const cookies = parseCookies(request);
        if (!code || !state || !cookies.meta_oauth_state || state !== cookies.meta_oauth_state) {
          return Response.redirect(new URL("/integracoes?meta=state_error", origin), 302);
        }

        try {
          const redirectUri = `${origin}/api/meta/callback`;
          const tokenUrl = new URL(`https://graph.facebook.com/${config.graphVersion}/oauth/access_token`);
          tokenUrl.searchParams.set("client_id", config.appId);
          tokenUrl.searchParams.set("client_secret", config.appSecret);
          tokenUrl.searchParams.set("redirect_uri", redirectUri);
          tokenUrl.searchParams.set("code", code);

          const tokenRes = await fetch(tokenUrl);
          const tokenJson = await tokenRes.json();
          if (!tokenRes.ok || !tokenJson.access_token) throw new Error(tokenJson?.error?.message || "Falha ao obter token da Meta");

          let accessToken = String(tokenJson.access_token);
          let expiresIn = Number(tokenJson.expires_in || 3600);

          const longUrl = new URL(`https://graph.facebook.com/${config.graphVersion}/oauth/access_token`);
          longUrl.searchParams.set("grant_type", "fb_exchange_token");
          longUrl.searchParams.set("client_id", config.appId);
          longUrl.searchParams.set("client_secret", config.appSecret);
          longUrl.searchParams.set("fb_exchange_token", accessToken);
          const longRes = await fetch(longUrl);
          const longJson = await longRes.json();
          if (longRes.ok && longJson.access_token) {
            accessToken = String(longJson.access_token);
            expiresIn = Number(longJson.expires_in || 60 * 24 * 60 * 60);
          }

          const headers = new Headers({ Location: new URL("/integracoes?meta=connected", origin).toString() });
          headers.append("Set-Cookie", cookie("meta_access_token", accessToken, Math.max(3600, expiresIn)));
          headers.append("Set-Cookie", cookie("meta_oauth_state", "", 0));
          return new Response(null, { status: 302, headers });
        } catch {
          return Response.redirect(new URL("/integracoes?meta=error", origin), 302);
        }
      },
    },
  },
});
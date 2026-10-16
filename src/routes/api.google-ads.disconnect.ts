import { createFileRoute } from "@tanstack/react-router";
import { googleCookie } from "@/lib/google-ads-server";

export const Route = createFileRoute("/api/google-ads/disconnect")({
  server: {
    handlers: {
      POST: async () => {
        const headers = new Headers({ "Content-Type": "application/json" });
        headers.append("Set-Cookie", googleCookie("google_ads_access_token", "", 0));
        headers.append("Set-Cookie", googleCookie("google_ads_refresh_token", "", 0));
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
      },
    },
  },
});
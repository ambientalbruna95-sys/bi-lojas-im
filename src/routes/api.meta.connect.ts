import { createFileRoute } from "@tanstack/react-router";
import { cookie, getMetaConfig } from "@/lib/meta-server";

export const Route = createFileRoute("/api/meta/connect")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const config = getMetaConfig();
        const origin = new URL(request.url).origin;
        if (!config) return Response.redirect(new URL("/integracoes?meta=setup", origin), 302);

        const state = crypto.randomUUID();
        const redirectUri = `${origin}/api/meta/callback`;
        const url = new URL(`https://www.facebook.com/${config.graphVersion}/dialog/oauth`);
        url.searchParams.set("client_id", config.appId);
        url.searchParams.set("redirect_uri", redirectUri);
        url.searchParams.set("response_type", "code");
        url.searchParams.set("state", state);
        url.searchParams.set("scope", [
          "pages_show_list",
          "pages_read_engagement",
          "instagram_basic",
          "business_management",
          "ads_read",
        ].join(","));

        return new Response(null, {
          status: 302,
          headers: {
            Location: url.toString(),
            "Set-Cookie": cookie("meta_oauth_state", state, 600),
          },
        });
      },
    },
  },
});
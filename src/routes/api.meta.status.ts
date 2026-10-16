import { createFileRoute } from "@tanstack/react-router";
import { getMetaAssets, getMetaConfig, parseCookies } from "@/lib/meta-server";

export const Route = createFileRoute("/api/meta/status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const config = getMetaConfig();
        if (!config) return Response.json({ configured: false, connected: false, pages: [], instagram: [], businesses: [], adAccounts: [], errors: [`Variável ausente: ${["META_APP_ID","META_APP_SECRET","META_GRAPH_VERSION"].filter((k) => !process.env[k]?.trim()).join(", ")}`] });

        const token = parseCookies(request).meta_access_token;
        if (!token) return Response.json({ configured: true, connected: false, pages: [], instagram: [], businesses: [], adAccounts: [], errors: [] });

        try {
          const assets = await getMetaAssets(token, config.graphVersion);
          return Response.json({ configured: true, ...assets });
        } catch (error) {
          return Response.json({
            configured: true,
            connected: false,
            pages: [],
            instagram: [],
            businesses: [],
            adAccounts: [],
            errors: [error instanceof Error ? error.message : String(error)],
          });
        }
      },
    },
  },
});
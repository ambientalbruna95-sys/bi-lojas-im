import { createFileRoute } from "@tanstack/react-router";
import { cookie } from "@/lib/meta-server";

export const Route = createFileRoute("/api/meta/disconnect")({
  server: {
    handlers: {
      POST: async () => {
        return Response.json({ ok: true }, {
          headers: { "Set-Cookie": cookie("meta_access_token", "", 0) },
        });
      },
    },
  },
});
import { createFileRoute } from "@tanstack/react-router";
import { getMetaConfig, metaGet, parseCookies } from "@/lib/meta-server";

type MetaAction = { action_type?: string; value?: string };

type MetaAdsRow = {
  accountId: string;
  accountName: string;
  currency: string;
  campaignId: string;
  campaignName: string;
  spend: number;
  reach: number;
  impressions: number;
  clicks: number;
  results: number;
  resultType: string;
  conversionValue: number;
};

const RESULT_PRIORITY = [
  "purchase",
  "omni_purchase",
  "lead",
  "onsite_conversion.lead_grouped",
  "messaging_conversation_started_7d",
  "onsite_conversion.messaging_conversation_started_7d",
  "complete_registration",
  "contact",
  "submit_application",
];

function monthRange(month: string) {
  const valid = /^\d{4}-\d{2}$/.test(month);
  const safe = valid ? month : new Date().toISOString().slice(0, 7);
  const [year, mon] = safe.split("-").map(Number);
  const last = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  return {
    month: safe,
    since: `${safe}-01`,
    until: `${safe}-${String(last).padStart(2, "0")}`,
  };
}

function n(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function pickResult(actions: MetaAction[] = []) {
  const map = new Map(actions.map((x) => [String(x.action_type || ""), n(x.value)]));
  for (const type of RESULT_PRIORITY) {
    const value = map.get(type);
    if (value && value > 0) return { value, type };
  }
  return { value: 0, type: "" };
}

function pickConversionValue(values: MetaAction[] = [], resultType = "") {
  if (!resultType) return 0;
  const exact = values.find((x) => x.action_type === resultType);
  if (exact) return n(exact.value);
  if (resultType === "purchase" || resultType === "omni_purchase") {
    const purchase = values.find((x) => x.action_type === "purchase" || x.action_type === "omni_purchase");
    return n(purchase?.value);
  }
  return 0;
}

export const Route = createFileRoute("/api/meta/ads-metrics")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const config = getMetaConfig();
        if (!config) {
          return Response.json(
            { ok: false, configured: false, connected: false, rows: [], errors: [`Credenciais da Meta não configuradas. Variável ausente: ${["META_APP_ID","META_APP_SECRET","META_GRAPH_VERSION"].filter((k) => !process.env[k]?.trim()).join(", ")}`] },
            { status: 503 },
          );
        }

        const token = parseCookies(request).meta_access_token;
        if (!token) {
          return Response.json(
            { ok: false, configured: true, connected: false, rows: [], errors: ["Meta Business não autorizado neste navegador."] },
            { status: 401 },
          );
        }

        const url = new URL(request.url);
        const range = monthRange(url.searchParams.get("month") || "");
        const errors: string[] = [];

        try {
          const accounts = await metaGet<{ data: Array<{ id: string; name: string; currency?: string }> }>(
            "me/adaccounts?fields=id,name,currency&limit=100",
            token,
            config.graphVersion,
          );

          const rows: MetaAdsRow[] = [];

          for (const account of accounts.data || []) {
            try {
              const fields = [
                "account_id",
                "account_name",
                "campaign_id",
                "campaign_name",
                "spend",
                "reach",
                "impressions",
                "clicks",
                "actions",
                "action_values",
              ].join(",");

              const timeRange = encodeURIComponent(JSON.stringify({ since: range.since, until: range.until }));
              const insights = await metaGet<{ data: any[] }>(
                `${account.id}/insights?level=campaign&fields=${encodeURIComponent(fields)}&time_range=${timeRange}&limit=500`,
                token,
                config.graphVersion,
              );

              for (const item of insights.data || []) {
                const result = pickResult(item.actions || []);
                rows.push({
                  accountId: String(item.account_id || account.id).replace(/^act_/, ""),
                  accountName: String(item.account_name || account.name || ""),
                  currency: String(account.currency || "BRL"),
                  campaignId: String(item.campaign_id || ""),
                  campaignName: String(item.campaign_name || "Campanha sem nome"),
                  spend: n(item.spend),
                  reach: n(item.reach),
                  impressions: n(item.impressions),
                  clicks: n(item.clicks),
                  results: result.value,
                  resultType: result.type,
                  conversionValue: pickConversionValue(item.action_values || [], result.type),
                });
              }
            } catch (error) {
              errors.push(`${account.name || account.id}: ${error instanceof Error ? error.message : String(error)}`);
            }
          }

          const totals = rows.reduce((acc, row) => ({
            spend: acc.spend + row.spend,
            reach: acc.reach + row.reach,
            impressions: acc.impressions + row.impressions,
            clicks: acc.clicks + row.clicks,
            results: acc.results + row.results,
            conversionValue: acc.conversionValue + row.conversionValue,
          }), { spend: 0, reach: 0, impressions: 0, clicks: 0, results: 0, conversionValue: 0 });

          return Response.json({
            ok: true,
            configured: true,
            connected: true,
            month: range.month,
            rows: rows.sort((a,b)=>b.spend-a.spend),
            totals,
            resultTrackingDetected: rows.some((x)=>x.results > 0),
            valueTrackingDetected: rows.some((x)=>x.conversionValue > 0),
            errors,
            fetchedAt: new Date().toISOString(),
          }, { headers: { "cache-control": "no-store" } });
        } catch (error) {
          return Response.json(
            {
              ok: false,
              configured: true,
              connected: true,
              month: range.month,
              rows: [],
              errors: [error instanceof Error ? error.message : String(error)],
            },
            { status: 502 },
          );
        }
      },
    },
  },
});
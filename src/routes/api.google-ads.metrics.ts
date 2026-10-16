import { createFileRoute } from "@tanstack/react-router";
import {
  explainGoogleAdsError,
  getGoogleAdsConfig,
  googleCookie,
  listAccessibleGoogleAdsCustomers,
  parseGoogleCookies,
  refreshGoogleAccessToken,
} from "@/lib/google-ads-server";

type AdsRow = {
  customerId: string;
  customerName: string;
  currency: string;
  campaignId: string;
  campaignName: string;
  channelType: string;
  cost: number;
  impressions: number;
  clicks: number;
  conversions: number;
  conversionValue: number;
};

type GoogleError = {
  account?: string;
  message: string;
};

const cleanCustomerId = (value: string) => String(value || "").replace(/\D/g, "");

function monthRange(month: string) {
  const ok = /^\d{4}-\d{2}$/.test(month);
  const safe = ok ? month : new Date().toISOString().slice(0, 7);
  const [year, mon] = safe.split("-").map(Number);
  const last = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  return {
    month: safe,
    start: `${safe}-01`,
    end: `${safe}-${String(last).padStart(2, "0")}`,
  };
}

async function adsSearch(
  accessToken: string,
  apiVersion: string,
  customerId: string,
  query: string,
  loginCustomerId?: string,
) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
  if (loginCustomerId && loginCustomerId !== customerId) {
    headers["login-customer-id"] = cleanCustomerId(loginCustomerId);
  }

  const res = await fetch(
    `https://googleads.googleapis.com/${apiVersion}/customers/${cleanCustomerId(customerId)}/googleAds:searchStream`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(25000),
    },
  );

  const data = await res.json().catch(() => null);
  if (!res.ok || data?.error) {
    const message = data?.error?.message || `Google Ads API respondeu ${res.status}`;
    const details = Array.isArray(data?.error?.details)
      ? data.error.details
          .flatMap((x: any) => x?.errors || [])
          .map((x: any) => x?.message || x?.errorCode)
          .filter(Boolean)
          .join(" · ")
      : "";
    throw new Error(details ? `${message} · ${details}` : message);
  }

  return Array.isArray(data) ? data.flatMap((batch: any) => batch?.results || []) : [];
}

async function campaignMetrics(
  accessToken: string,
  apiVersion: string,
  customerId: string,
  start: string,
  end: string,
  loginCustomerId?: string,
): Promise<AdsRow[]> {
  const query = `
    SELECT
      customer.id,
      customer.descriptive_name,
      customer.currency_code,
      campaign.id,
      campaign.name,
      campaign.advertising_channel_type,
      metrics.cost_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      metrics.conversions_value
    FROM campaign
    WHERE segments.date BETWEEN '${start}' AND '${end}'
      AND campaign.status != 'REMOVED'
    ORDER BY metrics.cost_micros DESC
  `;

  const results = await adsSearch(accessToken, apiVersion, customerId, query, loginCustomerId);
  return results.map((r: any) => ({
    customerId: cleanCustomerId(r?.customer?.id || customerId),
    customerName: String(r?.customer?.descriptiveName || r?.customer?.descriptive_name || ""),
    currency: String(r?.customer?.currencyCode || r?.customer?.currency_code || "BRL"),
    campaignId: String(r?.campaign?.id || ""),
    campaignName: String(r?.campaign?.name || "Campanha sem nome"),
    channelType: String(r?.campaign?.advertisingChannelType || r?.campaign?.advertising_channel_type || "Google Ads"),
    cost: Number(r?.metrics?.costMicros ?? r?.metrics?.cost_micros ?? 0) / 1_000_000,
    impressions: Number(r?.metrics?.impressions || 0),
    clicks: Number(r?.metrics?.clicks || 0),
    conversions: Number(r?.metrics?.conversions || 0),
    conversionValue: Number(r?.metrics?.conversionsValue ?? r?.metrics?.conversions_value ?? 0),
  })).filter((row) => row.cost || row.impressions || row.clicks || row.conversions || row.conversionValue);
}

async function childCustomers(
  accessToken: string,
  apiVersion: string,
  managerId: string,
) {
  const query = `
    SELECT
      customer_client.client_customer,
      customer_client.descriptive_name,
      customer_client.manager,
      customer_client.level,
      customer_client.status
    FROM customer_client
    WHERE customer_client.level <= 1
  `;

  const results = await adsSearch(accessToken, apiVersion, managerId, query);
  return results
    .map((r: any) => ({
      id: cleanCustomerId(r?.customerClient?.clientCustomer || r?.customer_client?.client_customer || ""),
      name: String(r?.customerClient?.descriptiveName || r?.customer_client?.descriptive_name || ""),
      manager: Boolean(r?.customerClient?.manager ?? r?.customer_client?.manager),
      level: Number(r?.customerClient?.level ?? r?.customer_client?.level ?? 0),
    }))
    .filter((x) => x.id && !x.manager && x.id !== cleanCustomerId(managerId));
}

export const Route = createFileRoute("/api/google-ads/metrics")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const config = getGoogleAdsConfig();
        if (!config) {
          return Response.json(
            { ok: false, configured: false, connected: false, rows: [], errors: [`Credenciais OAuth do Google Ads não configuradas. Variável ausente: ${["GOOGLE_ADS_CLIENT_ID","GOOGLE_ADS_CLIENT_SECRET"].filter((k) => !process.env[k]?.trim()).join(", ")}`] },
            { status: 503 },
          );
        }

        const url = new URL(request.url);
        const range = monthRange(url.searchParams.get("month") || "");
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
            return Response.json(
              { ok: false, configured: true, connected: false, rows: [], errors: ["Google Ads não autorizado neste navegador."] },
              { status: 401 },
            );
          }

          const accessible = await listAccessibleGoogleAdsCustomers(accessToken, config.apiVersion);
          const rows: AdsRow[] = [];
          const errors: GoogleError[] = [];
          const queried = new Set<string>();

          for (const account of accessible) {
            const customerId = cleanCustomerId(account);
            if (!customerId || queried.has(customerId)) continue;

            try {
              const directRows = await campaignMetrics(
                accessToken,
                config.apiVersion,
                customerId,
                range.start,
                range.end,
              );
              rows.push(...directRows);
              queried.add(customerId);
              continue;
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error);
              const low = message.toLowerCase();
              const looksLikeManager =
                low.includes("manager") ||
                low.includes("metrics") ||
                low.includes("request_error");

              if (!looksLikeManager) {
                errors.push({ account: customerId, message: explainGoogleAdsError(message) });
                queried.add(customerId);
                continue;
              }
            }

            try {
              const children = await childCustomers(accessToken, config.apiVersion, customerId);
              if (!children.length) {
                errors.push({ account: customerId, message: "Conta de administrador encontrada, mas nenhuma conta cliente de anúncios foi localizada." });
              }

              for (const child of children) {
                if (queried.has(child.id)) continue;
                try {
                  rows.push(...await campaignMetrics(
                    accessToken,
                    config.apiVersion,
                    child.id,
                    range.start,
                    range.end,
                    customerId,
                  ));
                } catch (error) {
                  errors.push({
                    account: child.id,
                    message: explainGoogleAdsError(error instanceof Error ? error.message : String(error)),
                  });
                }
                queried.add(child.id);
              }
              queried.add(customerId);
            } catch (error) {
              errors.push({
                account: customerId,
                message: explainGoogleAdsError(error instanceof Error ? error.message : String(error)),
              });
              queried.add(customerId);
            }
          }

          const unique = new Map<string, AdsRow>();
          for (const row of rows) {
            const key = `${row.customerId}:${row.campaignId}`;
            const current = unique.get(key);
            if (!current) {
              unique.set(key, row);
            } else {
              unique.set(key, {
                ...current,
                cost: current.cost + row.cost,
                impressions: current.impressions + row.impressions,
                clicks: current.clicks + row.clicks,
                conversions: current.conversions + row.conversions,
                conversionValue: current.conversionValue + row.conversionValue,
              });
            }
          }

          const finalRows = [...unique.values()].sort((a, b) => b.cost - a.cost);
          const totals = finalRows.reduce((acc, row) => ({
            cost: acc.cost + row.cost,
            impressions: acc.impressions + row.impressions,
            clicks: acc.clicks + row.clicks,
            conversions: acc.conversions + row.conversions,
            conversionValue: acc.conversionValue + row.conversionValue,
          }), { cost: 0, impressions: 0, clicks: 0, conversions: 0, conversionValue: 0 });

          const headers = new Headers({
            "Content-Type": "application/json",
            "cache-control": "no-store",
          });
          if (renewed) {
            headers.append("Set-Cookie", googleCookie("google_ads_access_token", accessToken, renewedMaxAge));
          }

          return new Response(JSON.stringify({
            ok: true,
            configured: true,
            connected: true,
            month: range.month,
            apiVersion: config.apiVersion,
            accounts: accessible,
            rows: finalRows,
            totals,
            conversionTrackingDetected: totals.conversions > 0 || totals.conversionValue > 0,
            errors,
            fetchedAt: new Date().toISOString(),
          }), { status: 200, headers });
        } catch (error) {
          const message = explainGoogleAdsError(error instanceof Error ? error.message : String(error));
          return Response.json(
            { ok: false, configured: true, connected: true, month: range.month, rows: [], errors: [{ message }] },
            { status: 502 },
          );
        }
      },
    },
  },
});
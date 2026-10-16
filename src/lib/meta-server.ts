export type MetaConfig = {
  appId: string;
  appSecret: string;
  graphVersion: string;
};

export function getMetaConfig(): MetaConfig | null {
  const appId = process.env.META_APP_ID?.trim();
  const appSecret = process.env.META_APP_SECRET?.trim();
  const graphVersion = process.env.META_GRAPH_VERSION?.trim();
  if (!appId || !appSecret || !graphVersion) return null;
  return { appId, appSecret, graphVersion };
}

export function parseCookies(request: Request) {
  const raw = request.headers.get("cookie") || "";
  return Object.fromEntries(
    raw.split(";").map((x) => x.trim()).filter(Boolean).map((x) => {
      const i = x.indexOf("=");
      return i === -1 ? [x, ""] : [decodeURIComponent(x.slice(0, i)), decodeURIComponent(x.slice(i + 1))];
    }),
  ) as Record<string, string>;
}

export function cookie(name: string, value: string, maxAge: number) {
  return `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export async function metaGet<T = any>(path: string, accessToken: string, graphVersion: string): Promise<T> {
  const url = new URL(`https://graph.facebook.com/${graphVersion}/${path.replace(/^\//, "")}`);
  url.searchParams.set("access_token", accessToken);
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data?.error) {
    const message = data?.error?.message || `Meta API respondeu ${res.status}`;
    throw new Error(message);
  }
  return data as T;
}

export async function getMetaAssets(accessToken: string, graphVersion: string) {
  const errors: string[] = [];

  const safe = async <T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await fn();
    } catch (error) {
      errors.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
      return fallback;
    }
  };

  const profile = await safe("Perfil", () => metaGet<{ id: string; name: string }>("me?fields=id,name", accessToken, graphVersion), { id: "", name: "" });

  const pagesResp = await safe(
    "Páginas",
    () => metaGet<{ data: Array<{ id: string; name: string; instagram_business_account?: { id: string; username?: string; name?: string } }> }>(
      "me/accounts?fields=id,name,instagram_business_account{id,username,name}",
      accessToken,
      graphVersion,
    ),
    { data: [] },
  );

  const businessesResp = await safe(
    "Business",
    () => metaGet<{ data: Array<{ id: string; name: string }> }>("me/businesses?fields=id,name", accessToken, graphVersion),
    { data: [] },
  );

  const adAccountsResp = await safe(
    "Contas de anúncios",
    () => metaGet<{ data: Array<{ id: string; name: string; account_status?: number; currency?: string }> }>(
      "me/adaccounts?fields=id,name,account_status,currency",
      accessToken,
      graphVersion,
    ),
    { data: [] },
  );

  const instagram = pagesResp.data
    .filter((p) => p.instagram_business_account)
    .map((p) => ({
      id: p.instagram_business_account!.id,
      username: p.instagram_business_account!.username || "",
      name: p.instagram_business_account!.name || "",
      pageId: p.id,
      pageName: p.name,
    }));

  return {
    connected: !!profile.id,
    profile,
    pages: pagesResp.data,
    instagram,
    businesses: businessesResp.data,
    adAccounts: adAccountsResp.data,
    errors,
  };
}
export type GoogleAdsConfig = {
  clientId: string;
  clientSecret: string;
  developerToken: string;
  apiVersion: string;
  redirectUri?: string;
};

export function getGoogleAdsConfig(): GoogleAdsConfig | null {
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET?.trim();
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim() || "";
  const apiVersion = process.env.GOOGLE_ADS_API_VERSION?.trim() || "v25";
  const redirectUri = process.env.GOOGLE_ADS_REDIRECT_URI?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, developerToken, apiVersion, redirectUri };
}

export function googleCookie(name: string, value: string, maxAge: number) {
  return `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function parseGoogleCookies(request: Request) {
  const raw = request.headers.get("cookie") || "";
  return Object.fromEntries(
    raw.split(";").map((x) => x.trim()).filter(Boolean).map((x) => {
      const i = x.indexOf("=");
      return i === -1 ? [x, ""] : [decodeURIComponent(x.slice(0, i)), decodeURIComponent(x.slice(i + 1))];
    }),
  ) as Record<string, string>;
}

export async function refreshGoogleAccessToken(refreshToken: string, config: GoogleAdsConfig) {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) throw new Error(data?.error_description || data?.error || "Falha ao atualizar token do Google");
  return {
    accessToken: String(data.access_token),
    expiresIn: Number(data.expires_in || 3600),
  };
}

export async function listAccessibleGoogleAdsCustomers(accessToken: string, apiVersion: string) {
  const res = await fetch(`https://googleads.googleapis.com/${apiVersion}/customers:listAccessibleCustomers`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
  const data = await res.json();
  if (!res.ok || data?.error) {
    throw new Error(data?.error?.message || `Google Ads API respondeu ${res.status}`);
  }
  const resources: string[] = Array.isArray(data.resourceNames) ? data.resourceNames : [];
  return resources.map((x) => x.replace("customers/", ""));
}

export async function getGoogleUser(accessToken: string) {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) return null;
  return {
    id: String(data.id || ""),
    email: String(data.email || ""),
    name: String(data.name || data.email || ""),
  };
}


export function googleAdsRedirectUri(origin: string, config?: GoogleAdsConfig | null) {
  return config?.redirectUri || `${origin}/api/google-ads/callback`;
}

export function explainGoogleAdsError(message: string) {
  const raw = String(message || "");
  const low = raw.toLowerCase();

  if (low.includes("redirect_uri_mismatch")) {
    return "O Google recusou o endereço de retorno. Cadastre exatamente o Redirect URI mostrado no BI em Google Cloud > OAuth 2.0 Client > Authorized redirect URIs.";
  }
  if (low.includes("cloud_project_not_approved_for_production") || low.includes("test access")) {
    return "O projeto Google Cloud está com acesso de teste. Para uma conta real do Google Ads, solicite nível Explorer, Basic ou Standard na página Google Ads API Overview do mesmo projeto.";
  }
  if (low.includes("access_not_configured") || low.includes("api has not been used") || low.includes("google ads api has not been used")) {
    return "A Google Ads API ainda não está ativada neste projeto do Google Cloud. Ative Google Ads API em APIs & Services > Library.";
  }
  if (low.includes("access_denied") || low.includes("permission") || low.includes("user_permission_denied")) {
    return "A conta Google autorizada não tem acesso suficiente à conta do Google Ads, ou o app OAuth está em modo Teste e esse e-mail não foi adicionado como usuário de teste.";
  }
  if (low.includes("invalid_client")) {
    return "O Client ID ou Client Secret do OAuth não corresponde ao projeto Google Cloud configurado.";
  }
  if (low.includes("invalid_grant")) {
    return "A autorização Google expirou ou foi revogada. Desconecte e conecte novamente para gerar um novo refresh token.";
  }
  return raw;
}
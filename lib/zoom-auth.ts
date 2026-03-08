import AsyncStorage from '@react-native-async-storage/async-storage';

const ZOOM_TOKEN_ENDPOINT = 'https://zoom.us/oauth/token';
const ZOOM_API_BASE = 'https://api.zoom.us/v2';
const TOKEN_STORAGE_KEY = '@claw_zoom_tokens';

export interface ZoomTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix ms
}

// ─── Server-to-Server OAuth (no redirect URI needed) ────────────────────────

/** Get an access token using Zoom Server-to-Server OAuth (account_credentials grant) */
export async function getServerToServerToken(
  accountId: string,
  clientId: string,
  clientSecret: string,
): Promise<ZoomTokens> {
  const credentials = btoa(`${clientId}:${clientSecret}`);

  const res = await fetch(ZOOM_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'account_credentials',
      account_id: accountId,
    }).toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Zoom auth failed: ${err}`);
  }

  const data = await res.json();
  const tokens: ZoomTokens = {
    accessToken: data.access_token,
    refreshToken: '', // S2S doesn't use refresh tokens
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  await AsyncStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
  return tokens;
}

/** Get a valid access token. Fetches a fresh one via S2S if expired. */
export async function getValidZoomToken(
  accountId: string,
  clientId: string,
  clientSecret: string,
  accessToken: string,
  refreshToken: string,
  tokenExpiry: number,
): Promise<ZoomTokens | null> {
  if (!clientId || !clientSecret || !accountId) return null;

  // Token still valid (with 5-min buffer)
  if (accessToken && tokenExpiry > Date.now() + 5 * 60 * 1000) {
    return { accessToken, refreshToken, expiresAt: tokenExpiry };
  }

  // Get a fresh S2S token
  try {
    return await getServerToServerToken(accountId, clientId, clientSecret);
  } catch {
    return null;
  }
}

/** Get the user's email from Zoom */
export async function getZoomUserEmail(accessToken: string): Promise<string> {
  const res = await fetch(`${ZOOM_API_BASE}/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return '';
  const data = await res.json();
  return data.email ?? '';
}

/** Clear stored tokens */
export async function signOut(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
}

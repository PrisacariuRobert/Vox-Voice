import AsyncStorage from '@react-native-async-storage/async-storage';

// Lazy-load — these are native modules that need a dev client rebuild
let WebBrowser: typeof import('expo-web-browser') | null = null;
try { WebBrowser = require('expo-web-browser'); WebBrowser?.maybeCompleteAuthSession(); } catch { /* needs rebuild */ }

const MS_TENANT = 'common';
const MS_AUTH_ENDPOINT = `https://login.microsoftonline.com/${MS_TENANT}/oauth2/v2.0/authorize`;
const MS_TOKEN_ENDPOINT = `https://login.microsoftonline.com/${MS_TENANT}/oauth2/v2.0/token`;
// Scopes that work with personal Microsoft accounts (outlook.com, hotmail.com, etc.)
// OnlineMeetings.ReadWrite removed — requires Teams license (work/school account only)
const MS_SCOPES = ['User.Read', 'Calendars.ReadWrite', 'Mail.Send', 'offline_access'];
const TOKEN_STORAGE_KEY = '@claw_ms_tokens';

export interface MicrosoftTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix ms
}

/** Get the OAuth2 discovery document for Microsoft */
export function getMicrosoftDiscovery(): { authorizationEndpoint: string; tokenEndpoint: string } {
  return {
    authorizationEndpoint: MS_AUTH_ENDPOINT,
    tokenEndpoint: MS_TOKEN_ENDPOINT,
  };
}

/** Get MS scopes */
export function getMicrosoftScopes(): string[] {
  return MS_SCOPES;
}

/** Exchange authorization code for tokens */
export async function exchangeCodeForTokens(
  code: string,
  clientId: string,
  redirectUri: string,
  codeVerifier: string,
): Promise<MicrosoftTokens> {
  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
    scope: MS_SCOPES.join(' '),
  });

  const res = await fetch(MS_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token exchange failed: ${err}`);
  }

  const data = await res.json();
  const tokens: MicrosoftTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? '',
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  await AsyncStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
  return tokens;
}

/** Refresh an expired access token */
export async function refreshMicrosoftToken(
  clientId: string,
  refreshToken: string,
): Promise<MicrosoftTokens> {
  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    scope: MS_SCOPES.join(' '),
  });

  const res = await fetch(MS_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    throw new Error('Token refresh failed — please sign in again.');
  }

  const data = await res.json();
  const tokens: MicrosoftTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  await AsyncStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
  return tokens;
}

/** Get a valid access token, refreshing if needed. Returns null if not signed in. */
export async function getValidAccessToken(
  clientId: string,
  accessToken: string,
  refreshToken: string,
  tokenExpiry: number,
): Promise<{ accessToken: string; refreshToken: string; expiresAt: number } | null> {
  if (!accessToken || !refreshToken) return null;

  // Token still valid (with 5-min buffer)
  if (tokenExpiry > Date.now() + 5 * 60 * 1000) {
    return { accessToken, refreshToken, expiresAt: tokenExpiry };
  }

  // Need to refresh
  try {
    return await refreshMicrosoftToken(clientId, refreshToken);
  } catch {
    return null;
  }
}

/** Get the user's email from Microsoft Graph */
export async function getMicrosoftUserEmail(accessToken: string): Promise<string> {
  const res = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return '';
  const data = await res.json();
  return data.mail ?? data.userPrincipalName ?? '';
}

/** Clear stored tokens */
export async function signOut(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
}

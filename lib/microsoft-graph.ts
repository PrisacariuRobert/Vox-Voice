import { ActionPayload } from '../types';

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

export interface GraphResult {
  success: boolean;
  error?: string;
  data?: Record<string, unknown>;
}

async function graphFetch(
  accessToken: string,
  path: string,
  body?: Record<string, unknown>,
  method: 'POST' | 'GET' | 'DELETE' | 'PATCH' = 'POST',
): Promise<GraphResult> {
  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
    };
    const opts: RequestInit = { method, headers };

    if (body && (method === 'POST' || method === 'PATCH')) {
      headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }

    const res = await fetch(`${GRAPH_BASE}${path}`, opts);

    if (res.ok || res.status === 202 || res.status === 204) {
      if (res.status === 204 || res.status === 202) return { success: true, data: {} };
      const data = await res.json().catch(() => ({}));
      return { success: true, data };
    }

    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    const errMsg = err.error?.message ?? `HTTP ${res.status}`;

    // Improve error messages for common auth/scope issues
    if (res.status === 401 || res.status === 403 || errMsg.toLowerCase().includes('authenticat')) {
      return { success: false, error: 'Permission denied. Your Microsoft account may need a Microsoft 365 work/school subscription for this feature. Try signing out and back in, or use Apple Calendar/Mail instead.' };
    }
    return { success: false, error: errMsg };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

/** Send an email via Outlook (Microsoft Graph) */
export async function sendOutlookEmail(
  accessToken: string,
  action: ActionPayload,
): Promise<GraphResult> {
  const toRecipients = (action.to ?? '')
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean)
    .map((address) => ({ emailAddress: { address } }));

  const ccRecipients = action.cc
    ? action.cc.split(',').map((a) => a.trim()).filter(Boolean).map((address) => ({ emailAddress: { address } }))
    : [];

  return graphFetch(accessToken, '/me/sendMail', {
    message: {
      subject: action.subject ?? '',
      body: {
        contentType: 'Text',
        content: action.body ?? '',
      },
      toRecipients,
      ccRecipients,
    },
    saveToSentItems: true,
  });
}

/** Create a calendar event in Outlook */
export async function createOutlookEvent(
  accessToken: string,
  action: ActionPayload,
  timezone: string,
): Promise<GraphResult> {
  const start = action.startTime ?? new Date().toISOString();
  // Default to 1 hour if no end time
  const end = action.endTime ?? new Date(new Date(start).getTime() + 60 * 60 * 1000).toISOString();

  const attendees = (action.attendees ?? []).map((email) => ({
    emailAddress: { address: email },
    type: 'required',
  }));

  return graphFetch(accessToken, '/me/events', {
    subject: action.title ?? 'New Event',
    start: { dateTime: start, timeZone: timezone },
    end: { dateTime: end, timeZone: timezone },
    location: action.location ? { displayName: action.location } : undefined,
    attendees: attendees.length > 0 ? attendees : undefined,
  });
}

/** Delete a calendar event in Outlook by searching for it */
export async function deleteOutlookEvent(
  accessToken: string,
  action: ActionPayload,
): Promise<GraphResult> {
  const searchTitle = action.searchTitle ?? action.title;
  if (!searchTitle) {
    return { success: false, error: 'No event title specified to delete.' };
  }

  // Search for events matching the title
  const filter = encodeURIComponent(`contains(subject,'${searchTitle.replace(/'/g, "''")}')`);
  const searchResult = await graphFetch(
    accessToken,
    `/me/events?$filter=${filter}&$top=5&$orderby=start/dateTime desc`,
    undefined,
    'GET',
  );
  if (!searchResult.success) return searchResult;

  const events = (searchResult.data as Record<string, unknown>)?.value as Array<Record<string, unknown>> | undefined;
  if (!events || events.length === 0) {
    return { success: false, error: `No event found matching "${searchTitle}".` };
  }

  // Delete the first (most recent) matching event
  const eventId = events[0].id as string;
  return graphFetch(accessToken, `/me/events/${eventId}`, undefined, 'DELETE');
}

/** Update a calendar event in Outlook by searching for it */
export async function updateOutlookEvent(
  accessToken: string,
  action: ActionPayload,
  timezone: string,
): Promise<GraphResult> {
  const searchTitle = action.searchTitle ?? action.title;
  if (!searchTitle) {
    return { success: false, error: 'No event title specified to update.' };
  }

  // Search for events matching the title
  const filter = encodeURIComponent(`contains(subject,'${searchTitle.replace(/'/g, "''")}')`);
  const searchResult = await graphFetch(
    accessToken,
    `/me/events?$filter=${filter}&$top=5&$orderby=start/dateTime desc`,
    undefined,
    'GET',
  );
  if (!searchResult.success) return searchResult;

  const events = (searchResult.data as Record<string, unknown>)?.value as Array<Record<string, unknown>> | undefined;
  if (!events || events.length === 0) {
    return { success: false, error: `No event found matching "${searchTitle}".` };
  }

  // Build update body — only include fields that were provided
  const eventId = events[0].id as string;
  const body: Record<string, unknown> = {};
  if (action.title && action.title !== searchTitle) body.subject = action.title;
  if (action.startTime) body.start = { dateTime: action.startTime, timeZone: timezone };
  if (action.endTime) body.end = { dateTime: action.endTime, timeZone: timezone };
  if (action.location) body.location = { displayName: action.location };

  return graphFetch(accessToken, `/me/events/${eventId}`, body, 'PATCH');
}

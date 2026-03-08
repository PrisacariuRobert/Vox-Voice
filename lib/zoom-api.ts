import { ActionPayload } from '../types';

const ZOOM_API_BASE = 'https://api.zoom.us/v2';

export interface ZoomResult {
  success: boolean;
  error?: string;
  data?: Record<string, unknown>;
}

/** Create a Zoom meeting */
export async function createZoomMeeting(
  accessToken: string,
  action: ActionPayload,
  timezone = 'UTC',
): Promise<ZoomResult> {
  const topic = action.meetingSubject ?? action.title ?? 'New Meeting';
  const startTime = action.meetingStartTime ?? action.startTime ?? new Date().toISOString();
  const endTime = action.meetingEndTime ?? action.endTime;

  // Calculate duration in minutes
  let duration = 60; // default 1 hour
  if (endTime && startTime) {
    const diff = new Date(endTime).getTime() - new Date(startTime).getTime();
    if (diff > 0) duration = Math.round(diff / 60000);
  }

  try {
    const res = await fetch(`${ZOOM_API_BASE}/users/me/meetings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic,
        type: 2, // Scheduled meeting
        start_time: startTime,
        duration,
        timezone,
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: true,
          waiting_room: false,
        },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        success: true,
        data: {
          id: data.id,
          joinUrl: data.join_url,
          startUrl: data.start_url,
          password: data.password,
          topic: data.topic,
        },
      };
    }

    const err = await res.json().catch(() => ({ message: res.statusText }));
    const errMsg = err.message ?? `HTTP ${res.status}`;

    if (res.status === 401 || res.status === 403) {
      return { success: false, error: 'Zoom permission denied. Try signing out and back in.' };
    }
    return { success: false, error: errMsg };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

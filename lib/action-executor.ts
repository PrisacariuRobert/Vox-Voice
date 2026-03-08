/**
 * Action Executor — Dispatches parsed [ACTION:] markers to the correct provider.
 *
 * Supported actions:
 *   send_email     → Microsoft Graph (Outlook) or Apple Mail (osascript fallback)
 *   create_event   → Outlook Calendar API or Apple Calendar (expo-calendar)
 *   create_meeting → Zoom Server-to-Server OAuth API → returns join link
 *   delete_event   → Outlook or Apple Calendar (searches by title within ±30 days)
 *   update_event   → Outlook or Apple Calendar (finds event by searchTitle, patches fields)
 *   set_alarm      → Opens Clock app via deep link (clock-alarm://) + notification backup
 *   cancel_alarm   → Opens Clock app, cancels all scheduled notifications
 *
 * Provider selection:
 *   - If Microsoft tokens are present → uses Outlook/Graph API
 *   - If Zoom credentials exist → uses Zoom API for meetings
 *   - Otherwise → falls back to Apple native (Calendar, Mail)
 *
 * Returns: { success: boolean, error?: string, provider?: string, data?: any }
 *
 * @module action-executor
 */
import { ActionPayload, AppSettings } from '../types';
import { getValidAccessToken } from './microsoft-auth';
import { sendOutlookEmail, createOutlookEvent, deleteOutlookEvent, updateOutlookEvent } from './microsoft-graph';
import { getValidZoomToken } from './zoom-auth';
import { createZoomMeeting } from './zoom-api';

// Lazy-load native modules (they crash if not in the dev build)
let Calendar: typeof import('expo-calendar') | null = null;
try { Calendar = require('expo-calendar'); } catch { /* needs rebuild */ }

let MailComposer: typeof import('expo-mail-composer') | null = null;
try { MailComposer = require('expo-mail-composer'); } catch { /* needs rebuild */ }

let Notifications: typeof import('expo-notifications') | null = null;
try { Notifications = require('expo-notifications'); } catch { /* needs rebuild */ }

export interface ActionResult {
  success: boolean;
  error?: string;
  provider?: string;
  data?: Record<string, unknown>;
}

/** Execute an action, routing to the correct provider based on settings */
export async function executeAction(
  action: ActionPayload,
  settings: AppSettings,
): Promise<ActionResult> {
  switch (action.actionType) {
    case 'send_email':
      return executeEmail(action, settings);
    case 'create_event':
      return executeCalendarEvent(action, settings);
    case 'create_meeting':
      return executeMeeting(action, settings);
    case 'delete_event':
      return executeDeleteEvent(action, settings);
    case 'update_event':
      return executeUpdateEvent(action, settings);
    case 'set_alarm':
      return executeSetAlarm(action, settings);
    case 'cancel_alarm':
      return executeCancelAlarm(settings);
    default:
      return { success: false, error: `Unknown action: ${action.actionType}` };
  }
}

// ─── Email ──────────────────────────────────────────────────────────────────

async function executeEmail(action: ActionPayload, settings: AppSettings): Promise<ActionResult> {
  if (settings.userEmailApp === 'outlook') {
    return executeOutlookEmail(action, settings);
  }
  // Apple Mail (default) — opens compose sheet pre-filled
  return executeAppleMail(action);
}

async function executeOutlookEmail(action: ActionPayload, settings: AppSettings): Promise<ActionResult> {
  const tokens = await getValidAccessToken(
    settings.microsoftClientId,
    settings.microsoftAccessToken,
    settings.microsoftRefreshToken,
    settings.microsoftTokenExpiry,
  );
  if (!tokens) {
    return { success: false, error: 'Not signed in to Microsoft. Go to Settings to sign in.' };
  }

  const result = await sendOutlookEmail(tokens.accessToken, action);
  return {
    success: result.success,
    error: result.error,
    provider: 'Outlook',
    data: result.data,
  };
}

async function executeAppleMail(action: ActionPayload): Promise<ActionResult> {
  if (!MailComposer) {
    return { success: false, error: 'Mail Composer not available. Rebuild with: npx expo run:ios' };
  }

  const isAvailable = await MailComposer.isAvailableAsync();
  if (!isAvailable) {
    return { success: false, error: 'No mail account configured on this device.' };
  }

  try {
    const result = await MailComposer.composeAsync({
      recipients: action.to ? action.to.split(',').map((a) => a.trim()) : [],
      ccRecipients: action.cc ? action.cc.split(',').map((a) => a.trim()) : [],
      subject: action.subject ?? '',
      body: action.body ?? '',
    });

    if (result.status === 'sent') {
      return { success: true, provider: 'Apple Mail' };
    }
    return { success: false, error: result.status === 'cancelled' ? 'Email cancelled' : 'Email not sent' };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed to compose email' };
  }
}

// ─── Calendar ───────────────────────────────────────────────────────────────

async function executeCalendarEvent(action: ActionPayload, settings: AppSettings): Promise<ActionResult> {
  if (settings.userCalendar === 'outlook') {
    return executeOutlookEvent(action, settings);
  }
  // Apple Calendar (default)
  return executeAppleCalendarEvent(action, settings);
}

async function executeOutlookEvent(action: ActionPayload, settings: AppSettings): Promise<ActionResult> {
  const tokens = await getValidAccessToken(
    settings.microsoftClientId,
    settings.microsoftAccessToken,
    settings.microsoftRefreshToken,
    settings.microsoftTokenExpiry,
  );
  if (!tokens) {
    return { success: false, error: 'Not signed in to Microsoft. Go to Settings to sign in.' };
  }

  const result = await createOutlookEvent(tokens.accessToken, action, settings.userTimezone);
  return {
    success: result.success,
    error: result.error,
    provider: 'Outlook Calendar',
    data: result.data,
  };
}

async function executeAppleCalendarEvent(action: ActionPayload, settings: AppSettings): Promise<ActionResult> {
  if (!Calendar) {
    return { success: false, error: 'Calendar not available. Rebuild with: npx expo run:ios' };
  }

  // Request permission
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== 'granted') {
    return { success: false, error: 'Calendar permission denied. Enable in Settings.' };
  }

  try {
    // Get the default calendar
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const defaultCal = calendars.find((c) => c.isPrimary) ?? calendars.find((c) => c.allowsModifications) ?? calendars[0];
    if (!defaultCal) {
      return { success: false, error: 'No writable calendar found.' };
    }

    const startDate = action.startTime ? new Date(action.startTime) : new Date();
    const endDate = action.endTime
      ? new Date(action.endTime)
      : new Date(startDate.getTime() + 60 * 60 * 1000); // Default 1 hour

    const eventId = await Calendar.createEventAsync(defaultCal.id, {
      title: action.title ?? 'New Event',
      startDate,
      endDate,
      location: action.location,
      timeZone: settings.userTimezone,
    });

    return {
      success: true,
      provider: 'Apple Calendar',
      data: { eventId },
    };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed to create event' };
  }
}

// ─── Zoom Meeting ────────────────────────────────────────────────────────────

async function executeMeeting(action: ActionPayload, settings: AppSettings): Promise<ActionResult> {
  const tokens = await getValidZoomToken(
    settings.zoomAccountId,
    settings.zoomClientId,
    settings.zoomClientSecret,
    settings.zoomAccessToken,
    settings.zoomRefreshToken,
    settings.zoomTokenExpiry,
  );
  if (!tokens) {
    return { success: false, error: 'Not signed in to Zoom. Go to Settings to connect your Zoom account.' };
  }

  const result = await createZoomMeeting(tokens.accessToken, action, settings.userTimezone);
  return {
    success: result.success,
    error: result.error,
    provider: 'Zoom',
    data: result.data,
  };
}

// ─── Delete Calendar Event ──────────────────────────────────────────────────

async function executeDeleteEvent(action: ActionPayload, settings: AppSettings): Promise<ActionResult> {
  if (settings.userCalendar === 'outlook') {
    return executeOutlookDeleteEvent(action, settings);
  }
  return executeAppleDeleteEvent(action, settings);
}

async function executeOutlookDeleteEvent(action: ActionPayload, settings: AppSettings): Promise<ActionResult> {
  const tokens = await getValidAccessToken(
    settings.microsoftClientId,
    settings.microsoftAccessToken,
    settings.microsoftRefreshToken,
    settings.microsoftTokenExpiry,
  );
  if (!tokens) {
    return { success: false, error: 'Not signed in to Microsoft. Go to Settings to sign in.' };
  }

  const result = await deleteOutlookEvent(tokens.accessToken, action);
  return {
    success: result.success,
    error: result.error,
    provider: 'Outlook Calendar',
    data: result.data,
  };
}

async function executeAppleDeleteEvent(action: ActionPayload, _settings: AppSettings): Promise<ActionResult> {
  if (!Calendar) {
    return { success: false, error: 'Calendar not available. Rebuild with: npx expo run:ios' };
  }

  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== 'granted') {
    return { success: false, error: 'Calendar permission denied. Enable in Settings.' };
  }

  const searchTitle = action.searchTitle ?? action.title;
  if (!searchTitle) {
    return { success: false, error: 'No event title specified to delete.' };
  }

  try {
    // Search within ±30 days
    const now = new Date();
    const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const calIds = calendars.filter((c) => c.allowsModifications).map((c) => c.id);

    const events = await Calendar.getEventsAsync(calIds, startDate, endDate);
    const match = events.find(
      (e) => e.title.toLowerCase().includes(searchTitle.toLowerCase())
    );

    if (!match) {
      return { success: false, error: `No event found matching "${searchTitle}".` };
    }

    await Calendar.deleteEventAsync(match.id);
    return {
      success: true,
      provider: 'Apple Calendar',
      data: { deletedTitle: match.title },
    };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed to delete event' };
  }
}

// ─── Update Calendar Event ──────────────────────────────────────────────────

async function executeUpdateEvent(action: ActionPayload, settings: AppSettings): Promise<ActionResult> {
  if (settings.userCalendar === 'outlook') {
    return executeOutlookUpdateEvent(action, settings);
  }
  return executeAppleUpdateEvent(action, settings);
}

async function executeOutlookUpdateEvent(action: ActionPayload, settings: AppSettings): Promise<ActionResult> {
  const tokens = await getValidAccessToken(
    settings.microsoftClientId,
    settings.microsoftAccessToken,
    settings.microsoftRefreshToken,
    settings.microsoftTokenExpiry,
  );
  if (!tokens) {
    return { success: false, error: 'Not signed in to Microsoft. Go to Settings to sign in.' };
  }

  const result = await updateOutlookEvent(tokens.accessToken, action, settings.userTimezone);
  return {
    success: result.success,
    error: result.error,
    provider: 'Outlook Calendar',
    data: result.data,
  };
}

async function executeAppleUpdateEvent(action: ActionPayload, settings: AppSettings): Promise<ActionResult> {
  if (!Calendar) {
    return { success: false, error: 'Calendar not available. Rebuild with: npx expo run:ios' };
  }

  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== 'granted') {
    return { success: false, error: 'Calendar permission denied. Enable in Settings.' };
  }

  const searchTitle = action.searchTitle ?? action.title;
  if (!searchTitle) {
    return { success: false, error: 'No event title specified to update.' };
  }

  try {
    // Search within ±30 days
    const now = new Date();
    const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const calIds = calendars.filter((c) => c.allowsModifications).map((c) => c.id);

    const events = await Calendar.getEventsAsync(calIds, startDate, endDate);
    const match = events.find(
      (e) => e.title.toLowerCase().includes(searchTitle.toLowerCase())
    );

    if (!match) {
      return { success: false, error: `No event found matching "${searchTitle}".` };
    }

    // Build update details — only include fields that were provided
    const updates: Record<string, unknown> = {};
    if (action.title && action.title !== searchTitle) updates.title = action.title;
    if (action.startTime) updates.startDate = new Date(action.startTime);
    if (action.endTime) updates.endDate = new Date(action.endTime);
    if (action.location) updates.location = action.location;
    if (updates.startDate && !updates.endDate) {
      updates.endDate = new Date((updates.startDate as Date).getTime() + 60 * 60 * 1000);
    }
    if (Object.keys(updates).length > 0) updates.timeZone = settings.userTimezone;

    await Calendar.updateEventAsync(match.id, updates);
    return {
      success: true,
      provider: 'Apple Calendar',
      data: { updatedTitle: action.title ?? match.title },
    };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed to update event' };
  }
}

// ─── Set Alarm (opens Clock app via deep link + notification backup) ────────

async function executeSetAlarm(action: ActionPayload, _settings: AppSettings): Promise<ActionResult> {
  if (!action.alarmTime) {
    return { success: false, error: 'No alarm time specified.' };
  }

  try {
    const [hours, minutes] = action.alarmTime.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) {
      return { success: false, error: `Invalid time format: "${action.alarmTime}". Use HH:MM.` };
    }

    const now = new Date();
    const alarmDate = new Date();
    alarmDate.setHours(hours, minutes, 0, 0);
    if (alarmDate <= now) {
      alarmDate.setDate(alarmDate.getDate() + 1);
    }

    const label = action.alarmLabel ?? 'Alarm';
    const Linking = require('expo-linking');

    // Open Clock app alarm tab via deep link
    // iOS supports clock-alarm:// to open the Alarms tab
    try {
      await Linking.openURL('clock-alarm://');
    } catch { /* deep link may not work on all devices */ }

    // Also schedule a notification as a reliable alarm backup
    if (Notifications) {
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status === 'granted') {
          const secondsUntilAlarm = Math.floor((alarmDate.getTime() - now.getTime()) / 1000);
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `🔔 ${label}`,
              body: `It's ${hours > 12 ? hours - 12 : hours}:${String(minutes).padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`,
              sound: true,
              priority: Notifications.AndroidNotificationPriority.MAX,
              data: { type: 'claw_alarm', alarmTime: action.alarmTime },
            },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: secondsUntilAlarm },
          });
        }
      } catch { /* notification failed, alarm tab still opened */ }
    }

    const displayTime = alarmDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isNextDay = alarmDate.getDate() !== now.getDate();

    return {
      success: true,
      provider: 'Clock',
      data: {
        alarmTime: displayTime,
        alarmDate: alarmDate.toISOString(),
        nextDay: isNextDay,
      },
    };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed to set alarm' };
  }
}

// ─── Cancel Alarm ───────────────────────────────────────────────────────────

async function executeCancelAlarm(_settings: AppSettings): Promise<ActionResult> {
  const Linking = require('expo-linking');

  try {
    // Open Clock app so user can manage alarms
    try {
      await Linking.openURL('clock-alarm://');
    } catch { /* deep link may not work */ }

    // Cancel our notification-based alarms too
    if (Notifications) {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const alarmNotifs = scheduled.filter(
        (n) => (n.content.data as Record<string, unknown>)?.type === 'claw_alarm'
      );
      for (const notif of alarmNotifs) {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }

    return {
      success: true,
      provider: 'Clock',
      data: { note: 'Opened Clock app for alarm management' },
    };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed to cancel alarm' };
  }
}

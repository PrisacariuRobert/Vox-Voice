import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';

import { VoiceOrb } from '../../components/VoiceOrb';
import { StatusDot } from '../../components/StatusDot';
import { CardEngine } from '../../components/ActionCards/CardEngine';

import { useOpenClaw } from '../../hooks/useOpenClaw';
import { useTTS } from '../../hooks/useTTS';
import { useVoiceInput } from '../../hooks/useVoiceInput';

import { loadSettings, buildProfileContext } from './settings';
import { parseResponse } from '../../lib/card-parser';
import { haptics } from '../../lib/audio-utils';
import { getCurrentLocation, UserLocation } from '../../lib/location';
import { openClawClient } from '../../lib/openclaw-client';

import { executeAction } from '../../lib/action-executor';
import { getMissingFields } from '../../lib/action-validator';
import { ClarificationDialog } from '../../components/ClarificationDialog';
import BottomSheet from '@gorhom/bottom-sheet';

import { GearIcon } from '../../components/Icons';
import { Colors } from '../../constants/colors';
import { AppSettings, OrbState, CardData, ActionPayload, ActionStatus, ConversationMessage } from '../../types';
import { DEFAULT_SETTINGS } from './settings';
import { addMessage, getConversations } from '../../lib/conversation-store';

// ─── Conversation context builder ────────────────────────────────────────────
/** Build concise summary of recent conversation for follow-up understanding */
function buildConversationContext(msgs: ConversationMessage[]): string {
  if (msgs.length === 0) return '';

  // Get last 10 messages (~5 turns)
  const recent = msgs.slice(-10);
  const lines: string[] = [];

  for (const msg of recent) {
    if (msg.role === 'user') {
      lines.push(`User: "${msg.content}"`);
    } else {
      const action = msg.card?.metadata?.action as ActionPayload | undefined;
      let summary: string;

      if (action) {
        switch (action.actionType) {
          case 'create_meeting':
            summary = `Created Zoom meeting: "${action.meetingSubject}" at ${action.meetingStartTime}`;
            break;
          case 'create_event':
            summary = `Created calendar event: "${action.title}" at ${action.startTime}`;
            break;
          case 'delete_event':
            summary = `Deleted event: "${action.searchTitle}"`;
            break;
          case 'send_email':
            summary = `Sent email to ${action.to}, subject: "${action.subject}"`;
            break;
          default:
            summary = `Performed action: ${action.actionType}`;
        }
      } else {
        // Clean summary of response (strip markers, truncate)
        const clean = msg.content
          .replace(/\[[A-Z_]+:[^\]]*\]/gi, '')
          .replace(/\[[A-Z_]+\]/gi, '')
          .trim();
        summary = clean.length > 120 ? clean.slice(0, 120) + '...' : clean;
      }

      lines.push(`Assistant: ${summary}`);
    }
  }

  return lines.join('\n');
}

// ─── Special phrase expansion ─────────────────────────────────────────────────
function expandSpecialPhrase(text: string, city?: string): string {
  const lower = text.toLowerCase().trim();

  // Morning briefing
  if (/^(good morning|morning|morning briefing|give me a briefing|my briefing|briefing)/.test(lower)) {
    const loc = city ?? 'Amsterdam';
    return `Give me my morning briefing right now. Do ALL of these steps in order without asking:
1. Run: date
2. Read today's calendar events via osascript (Apple Calendar, all calendars)
3. Read my top 3 inbox emails via Apple Mail osascript (sender + subject only)
4. Get weather: curl -s "wttr.in/${encodeURIComponent(loc)}?format=3"
Speak everything as a warm, concise personal assistant briefing. End with [BRIEFING].`;
  }

  // Today's schedule
  if (/(what.*today|today.*schedule|my schedule|my events|my calendar today)/.test(lower)) {
    return `Read today's calendar events using Apple Calendar osascript and tell me what I have today. End with [CALENDAR_EVENTS].`;
  }

  // Save email as draft (must check BEFORE send email)
  if (/(save.*draft|save.*email.*draft|draft.*save|just.*draft|as a draft)/.test(lower)) {
    return `The user wants to save an email draft: "${text}".
If the user references something from the conversation, use the conversation context above to fill in relevant details.
Extract the recipient (if any), subject, and body from the request.
SAVE the draft (do NOT send it) using this osascript command:
osascript -e 'tell application "Mail"
set newMsg to make new outgoing message with properties {subject:"SUBJECT_HERE", content:"BODY_HERE", visible:false}
tell newMsg
make new to recipient at end of to recipients with properties {address:"RECIPIENT_EMAIL_OR_EMPTY"}
end tell
end tell'
This creates the draft in Mail without sending. Do NOT call "send newMsg".
If no recipient is specified, use an empty string for the address or omit the to-recipient line.
Confirm the draft was saved. End with [EMAIL_DRAFT_SAVED].`;
  }

  // Send email / draft email
  // Also catches "email Marine about..." (email + person name at start of sentence)
  if (/(send.*email|email.*to|compose.*email|write.*email|draft.*email|reply.*email|^email\s+[a-z])/.test(lower)) {
    return `The user wants to send an email: "${text}".
If the user references something from the conversation (like "this meeting", "about that", "the event"), use the conversation context provided above to fill in the relevant details (subject, body, meeting link, etc.).
Extract the recipient, subject, and body from the request. If any critical detail is missing (especially the recipient), ASK the user before proceeding.
When you have all the details, SEND the email using this osascript command:
osascript -e 'tell application "Mail"
set newMsg to make new outgoing message with properties {subject:"SUBJECT_HERE", content:"BODY_HERE", visible:false}
tell newMsg
make new to recipient at end of to recipients with properties {address:"RECIPIENT_EMAIL"}
end tell
send newMsg
end tell'
Replace SUBJECT_HERE, BODY_HERE, and RECIPIENT_EMAIL with the actual values. Escape any single quotes in the text.
After sending, confirm what you sent. End with [EMAIL_SENT].`;
  }

  // Zoom meeting — use ACTION marker (MUST check BEFORE calendar to prioritize meetings)
  if (/(meeting|schedule.*meeting|create.*meeting|book.*meeting|arrange.*meeting|set up.*meeting|zoom|teams)/.test(lower)) {
    // Check if user also wants to send the link to someone
    const sendMatch = text.match(/(?:and\s+)?(?:send|share|email)\s+(?:it\s+)?(?:the\s+)?(?:link\s+)?(?:to\s+)([A-Za-z@.\-_]+(?:@[A-Za-z.\-]+)?)/i);
    const sendTo = sendMatch?.[1] ?? '';
    const sendToParam = sendTo ? ` sendTo="${sendTo}"` : '';
    return `The user wants to schedule a Zoom meeting: "${text}".
IMPORTANT: You have direct API access to create Zoom meetings. Do NOT open the Zoom app. Do NOT use osascript. Do NOT tell the user to do anything manually.
Extract the meeting subject, date/time, and duration. Convert relative dates (e.g. "tomorrow") to ISO 8601 format using today's date. If end time is not specified, default to 1 hour after start.
You MUST respond with this exact marker format:
[ACTION:create_meeting meetingSubject="Meeting Subject" meetingStartTime="2024-03-08T14:00:00" meetingEndTime="2024-03-08T15:00:00"${sendToParam}]
The app will create the meeting via the Zoom API and return a join link automatically. The app will AUTOMATICALLY email the join link after the meeting is created — do NOT write any osascript, email commands, or Mail app commands. Do NOT say "check your Zoom app" — the link will be emailed.
${sendTo ? `The user wants the link sent to ${sendTo}. If "${sendTo}" looks like a name, try to find their email from conversation context and include it as sendTo in the ACTION marker. Just confirm the meeting and mention the link will be emailed to ${sendTo}.` : 'Just confirm what meeting you created. The link will be emailed automatically.'}`;
  }

  // Schedule calendar event — use ACTION marker
  if (/(add.*event|create.*event|schedule.*event|add.*calendar|put.*calendar)/.test(lower)) {
    return `The user wants to create a calendar event: "${text}".
IMPORTANT: You have direct API access to create calendar events. Do NOT use osascript. Do NOT tell the user to open any app.
Extract the event title, date/time, duration, location, and attendees from the request. Convert relative dates (e.g. "tomorrow") to ISO 8601 format using today's date. If the end time is not specified, default to 1 hour after start.
If critical details are missing (especially the date/time), ASK the user.
When you have all the details, you MUST include this exact marker in your response:
[ACTION:create_event title="Event Name" startTime="2024-03-08T11:30:00" endTime="2024-03-08T12:30:00" location="Place" attendees="person@email.com"]
The app will create the event automatically. Then briefly confirm what you created.`;
  }

  // Edit / modify / update / reschedule calendar event — use ACTION marker
  if (/(edit.*event|modify.*event|update.*event|change.*event|reschedule.*event|move.*event|edit.*calendar|modify.*calendar|change.*meeting|reschedule.*meeting|move.*meeting|update.*meeting)/.test(lower)) {
    return `The user wants to update/edit a calendar event: "${text}".
IMPORTANT: You have direct API access to update calendar events. Do NOT use osascript. Do NOT tell the user to open any app.
If the user references something from the conversation (like "this meeting", "that event"), use the conversation context above to identify which event.
Extract what to search for (the current event title) and what to change (new title, new time, new location).
You MUST include this exact marker in your response:
[ACTION:update_event searchTitle="Current Event Title" title="New Title" startTime="2024-03-08T14:00:00" endTime="2024-03-08T15:00:00" location="New Location"]
Only include fields that are being changed. searchTitle is always required.
The app will find and update the matching event automatically. Then briefly confirm what you changed.`;
  }

  // Delete / cancel / remove calendar event — use ACTION marker
  if (/(delete.*event|cancel.*event|remove.*event|delete.*calendar|remove.*calendar|cancel.*meeting|delete.*meeting|remove.*meeting)/.test(lower)) {
    return `The user wants to delete a calendar event: "${text}".
IMPORTANT: You have direct API access to delete calendar events. Do NOT use osascript. Do NOT tell the user to open any app.
Extract the event title or meeting name from the request. Use whatever identifying details the user provides.
You MUST include this exact marker in your response:
[ACTION:delete_event searchTitle="Event Name To Search For"]
The app will find and delete the matching event automatically. Then briefly confirm what you deleted.`;
  }

  // Read emails (not sending)
  if (/(read.*email|check.*email|check.*inbox|my emails|my inbox|latest email|last.*email)/.test(lower)) {
    return `Read my last 3 inbox emails using Apple Mail osascript. For each one tell me who it's from and the subject. Then offer to read the full body of any of them.`;
  }

  // AirPlay redirect helper — used in all music playback prompts
  const wantsPhone = /(on my phone|on my iphone|on.*airplay|on.*airpod|to my phone|to my iphone|audio.*phone|audio.*iphone|put.*audio|redirect.*audio|send.*audio)/.test(lower);
  const airplayStep = wantsPhone ? `
AIRPLAY: After playback starts, redirect audio to the user's iPhone/AirPods:
osascript -e 'tell application "Music"
  set airplayDevs to (every AirPlay device)
  repeat with d in airplayDevs
    if (name of d) contains "iPhone" or (name of d) contains "AirPods" or (name of d) contains "Roberto" then
      set selected of d to true
      return "AirPlay set to: " & name of d
    end if
  end repeat
  return "No iPhone/AirPods found in AirPlay devices"
end tell'
If no match found, list available devices: osascript -e 'tell application "Music" to get name of every AirPlay device'` : '';

  // Apple Music — play song / control
  if (/(apple music|on.*my.*library|from.*my.*library)/.test(lower)) {
    const songMatch = lower.match(/play\s+(.+?)(?:\s+on|\s+from|\s+in|$)/);
    if (songMatch) {
      return `Play "${songMatch[1]}" on Apple Music. You MUST actually start playback, not just search.
Step 1: Try library search: osascript -e 'tell application "Music" to play (first item of (search playlist "Library" for "${songMatch[1]}"))'
Step 2: If that fails (not in library), search and play: osascript -e 'tell application "Music" to activate' && sleep 1 && open "music://music.apple.com/search?term=${encodeURIComponent(songMatch[1])}" && sleep 3 && osascript -e 'tell application "Music" to play'
Step 3: Verify: osascript -e 'tell application "Music" to return player state' — if stopped, run: osascript -e 'tell application "Music" to play'
Step 4: Get info: osascript -e 'tell application "Music" to return name of current track & " | " & artist of current track & " | " & album of current track'${airplayStep}
End with [NOW_PLAYING: title="SONG", artist="ARTIST", album="ALBUM", source="Apple Music"].`;
    }
    return `${text} — use Apple Music. Activate and ensure playback starts. Verify with: osascript -e 'tell application "Music" to return player state'.${airplayStep}
End with [NOW_PLAYING: title="SONG", artist="ARTIST", album="ALBUM", source="Apple Music"].`;
  }

  // What's playing — Apple Music only
  if (/(what.*playing|what.*song|current.*track|what.*music|now playing)/.test(lower)) {
    return `Check what's currently playing on Apple Music using: osascript -e 'tell application "Music" to return name of current track & " by " & artist of current track & " from " & album of current track'
Tell me what's playing and end with [NOW_PLAYING: title="SONG", artist="ARTIST", album="ALBUM", source="Apple Music"].`;
  }

  // Music controls — pause, resume, next, previous
  if (/^(pause|stop|resume|next|skip|previous|back)\s*(music|song|track)?$/.test(lower)) {
    if (/^(pause|stop)/.test(lower)) return `Pause music: osascript -e 'tell application "Music" to pause'. Confirm paused. End with [NOW_PLAYING: title="Paused", artist="", album="", source="Apple Music"].`;
    if (/^resume/.test(lower)) return `Resume music: osascript -e 'tell application "Music" to play'. Get track info: osascript -e 'tell application "Music" to return name of current track & " | " & artist of current track'. End with [NOW_PLAYING: title="SONG", artist="ARTIST", album="", source="Apple Music"].`;
    if (/^(next|skip)/.test(lower)) return `Next track: osascript -e 'tell application "Music" to next track'. Get info: osascript -e 'tell application "Music" to return name of current track & " | " & artist of current track'. End with [NOW_PLAYING: title="SONG", artist="ARTIST", album="", source="Apple Music"].`;
    return `Previous track: osascript -e 'tell application "Music" to previous track'. Get info: osascript -e 'tell application "Music" to return name of current track & " | " & artist of current track'. End with [NOW_PLAYING: title="SONG", artist="ARTIST", album="", source="Apple Music"].`;
  }

  // Generic play music — always use Apple Music
  if (/^play\s+(.+)/.test(lower) && !/(podcast|episode)/.test(lower)) {
    const songMatch = lower.match(/^play\s+(.+?)(?:\s+(?:and|on my|to my|put).*)?$/);
    const query = songMatch?.[1] ?? text;
    return `Play "${query}" on Apple Music. You MUST actually start playback — do NOT just open a search page.
CRITICAL: You must run ALL these steps in order and verify playback actually starts:
Step 1: Try library: osascript -e 'tell application "Music" to play (first item of (search playlist "Library" for "${query}"))'
Step 2: If Step 1 fails (not in library): osascript -e 'tell application "Music" to activate' && sleep 1 && open "music://music.apple.com/search?term=${encodeURIComponent(query)}" && sleep 3 && osascript -e 'tell application "Music" to play'
Step 3: Verify: osascript -e 'tell application "Music" to return player state' — if still stopped, run: osascript -e 'tell application "Music" to play'
Step 4: Get info: osascript -e 'tell application "Music" to return name of current track & " | " & artist of current track & " | " & album of current track'${airplayStep}
End with [NOW_PLAYING: title="SONG", artist="ARTIST", album="ALBUM", source="Apple Music"].`;
  }

  // Good night
  if (/^good night/.test(lower)) {
    return `Say good night to me and quickly check: any calendar events tomorrow morning? Any urgent unread emails? Keep it brief and warm.`;
  }

  // Home automation
  if (/(turn on.*light|turn off.*light|lights on|lights off|dim.*light|bright.*light)/.test(lower)) {
    return `${text}. Use Apple Shortcuts osascript: shortcuts run "Turn On Lights" or "Turn Off Lights" as appropriate. Confirm what you did. End with [HOME: action="lights", device="Lights"].`;
  }
  if (/(lock.*door|unlock.*door|front door)/.test(lower)) {
    const isLock = /lock/.test(lower) && !/unlock/.test(lower);
    return `${text}. Use Apple Shortcuts: shortcuts run "${isLock ? 'Lock' : 'Unlock'} Front Door". Confirm. End with [HOME: action="${isLock ? 'locked' : 'unlocked'}", device="Front Door"].`;
  }
  if (/(home scene|movie time|good morning scene|away mode|arrive home|bedtime scene)/.test(lower)) {
    return `${text}. Use Apple Shortcuts to run the appropriate home scene. End with [HOME: action="scene", device="Home"].`;
  }
  if (/(thermostat|temperature.*degree|set.*heat|set.*cool)/.test(lower)) {
    const temp = lower.match(/(\d+)\s*(?:degree|°|c\b|f\b)/)?.[1];
    return `${text}. Use Apple Shortcuts to set the thermostat${temp ? ` to ${temp}°` : ''}. End with [HOME: action="thermostat", device="Thermostat"].`;
  }

  // Stocks
  if (/(stock price|how.*doing.*stock|check.*stock|share price|market|how is .* stock|how's .* doing)/.test(lower)) {
    const sym = lower.match(/\b([a-z]{1,5})\s+stock|\bhow.*\b([a-z]{2,5})\b.*doing/)?.[1] ?? 'AAPL';
    return `Get the current stock price for ${sym.toUpperCase()} using the Yahoo Finance curl command from TOOLS.md. Tell me the price and percentage change. End with [STOCKS: symbols="${sym.toUpperCase()}"].`;
  }

  // Stocks shorthand
  if (/\b(aapl|tsla|googl|goog|msft|amzn|meta|nvda|nflx|aapl)\b/.test(lower)) {
    const sym = lower.match(/\b(aapl|tsla|googl|goog|msft|amzn|meta|nvda|nflx)\b/)?.[1]?.toUpperCase() ?? 'AAPL';
    return `Get the current stock price for ${sym} using the Yahoo Finance curl command from TOOLS.md. End with [STOCKS: symbols="${sym}"].`;
  }

  // News
  if (/(top news|latest news|what.*news|news today|headlines|what.*happening)/.test(lower)) {
    return `Get top 5 news headlines using the BBC RSS curl command from TOOLS.md. Read them to me. End with [NEWS: count=5].`;
  }

  // Alarm — set, turn on/off, snooze, dismiss (uses ACTION markers — app executes directly)
  if (/(turn off.*alarm|disable.*alarm|stop.*alarm|silence.*alarm|dismiss.*alarm|cancel.*alarm|snooze.*alarm)/.test(lower)) {
    return `The user wants to turn off / cancel an alarm: "${text}".
You MUST include this exact marker:
[ACTION:cancel_alarm]
The app will find and remove all active alarms automatically.
Confirm the alarm has been turned off.`;
  }
  if (/(turn on.*alarm|enable.*alarm|activate.*alarm|set.*alarm|wake.*me.*at|alarm.*for|alarm.*at)/.test(lower)) {
    const timeMatch = text.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i);
    const time = timeMatch?.[1] ?? '';
    // Convert to 24h format for the ACTION marker
    let time24 = '';
    if (time) {
      const isPM = /pm/i.test(time);
      const isAM = /am/i.test(time);
      const cleanTime = time.replace(/\s*(am|pm)/i, '');
      const parts = cleanTime.split(':');
      let h = parseInt(parts[0]);
      const m = parts[1] ? parseInt(parts[1]) : 0;
      if (isPM && h < 12) h += 12;
      if (isAM && h === 12) h = 0;
      time24 = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    return `The user wants to set an alarm: "${text}".
${time24 ? `You MUST include this exact marker:
[ACTION:set_alarm alarmTime="${time24}" alarmLabel="Alarm"]
The app will open the Clock app's alarm tab and also set a notification backup at ${time}. If the time has already passed today, it will be set for tomorrow.
ALSO: Use this Shortcuts command on the Mac to create the alarm in the actual Clock app:
shortcuts run "Create Alarm" <<< '{"time":"${time24}","label":"Alarm"}'
If that shortcut doesn't exist, tell the user the Clock app has been opened for them.
Confirm the alarm is set for ${time}.` : `Ask the user what time they want the alarm for. Once you know the time, respond with:
[ACTION:set_alarm alarmTime="HH:MM" alarmLabel="Alarm"]
where HH:MM is in 24-hour format (e.g. 07:00 for 7am, 15:30 for 3:30pm).`}`;
  }

  // Create note — "create a note", "write a note", "take a note", "note that..."
  if (/(create.*note|write.*note|take.*note|make.*note|new note|save.*note|^note\s+that|^note\s+this|jot.*down)/.test(lower)) {
    const noteContent = text.replace(/^(create|write|take|make|save)\s+(a\s+)?note\s*(about|that|saying|with)?\s*/i, '').trim();
    return `The user wants to create a note: "${text}".
${noteContent ? `Note content: "${noteContent}"` : 'Ask the user what they want the note to say.'}
Create the note using this osascript command:
osascript -e 'tell application "Notes"
  tell account "iCloud"
    make new note at folder "Notes" with properties {name:"NOTE_TITLE", body:"<html><body>NOTE_BODY</body></html>"}
  end tell
end tell'
Replace NOTE_TITLE with a short title derived from the content, and NOTE_BODY with the full note text.
Escape any single quotes in the text with '"'"'.
Confirm the note was created. End with [NOTES_RESULT: count=1].`;
  }

  // Reminders — create
  if (/(remind me|set.*reminder|create.*reminder|add.*reminder)/.test(lower)) {
    const reminderContent = text.replace(/^(remind me to|set a reminder to|create a reminder to|add a reminder to)\s*/i, '').trim();
    return `The user wants to create a reminder: "${text}".
${reminderContent ? `Reminder: "${reminderContent}"` : 'Ask the user what they want to be reminded about.'}
Create the reminder using this osascript command:
osascript -e 'tell application "Reminders"
  tell list "Reminders"
    make new reminder with properties {name:"REMINDER_TEXT"}
  end tell
end tell'
Replace REMINDER_TEXT with the actual reminder text.
Confirm the reminder was created. End with [SYSTEM: action="reminder_created"].`;
  }

  // Reminders list
  if (/(my reminders|list.*reminder|show.*reminder|what.*remind)/.test(lower)) {
    return `List all my incomplete reminders using Apple Reminders osascript from TOOLS.md. Read them to me.`;
  }

  // Podcasts
  if (/(podcast|podcasts|play.*podcast|pause.*podcast)/.test(lower)) {
    if (/pause|stop/.test(lower)) {
      return `Pause the podcast using: osascript -e 'tell application "Podcasts" to playpause'. Confirm paused. End with [SYSTEM: action="paused"].`;
    }
    return `${text}. Use Podcasts app osascript from TOOLS.md. Get what's playing and end with [NOW_PLAYING: title="EPISODE", artist="PODCAST", album="", source="Podcasts"].`;
  }

  // Weather for future dates — "weather on Friday", "weather tomorrow", "forecast next week"
  if (/(weather|forecast).*(tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week|this week|weekend)/.test(lower)
    || /(tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week).*(?:weather|forecast)/.test(lower)) {
    const loc = city ?? 'Amsterdam';
    return `Get the weather forecast for ${loc}: "${text}".
Use this command for a multi-day forecast: curl -s "wttr.in/${encodeURIComponent(loc)}?format=v2"
Or for specific days use: curl -s "wttr.in/${encodeURIComponent(loc)}?format=%C+%t+%w&period=3"
Parse the forecast and tell the user about the specific day(s) they asked about.
Give a friendly, helpful weather summary with the key details.`;
  }

  // Weather today (current conditions)
  if (/(weather|forecast|temperature|will it rain|going to rain|sunny|what.*outside)/.test(lower)) {
    const loc = city ?? 'Amsterdam';
    return `Get the weather for ${loc} using: curl -s "wttr.in/${encodeURIComponent(loc)}?format=%C,+%t,+feels+like+%f,+humidity+%h,+wind+%w"
Then give me a friendly weather summary.`;
  }

  // Bluetooth / AirPods
  if (/(bluetooth|airpods|connect.*headphone|connect.*earphone|audio.*device)/.test(lower)) {
    return `${text}. Use the system_profiler or SwitchAudioSource commands from TOOLS.md to check/switch Bluetooth audio. Report what you find.`;
  }

  // Siri Shortcuts
  if (/(run.*shortcut|shortcut.*run|my shortcut|apple shortcut)/.test(lower)) {
    const name = text.replace(/^.*shortcut[s]?\s+/i, '').replace(/^run\s+/i, '').trim();
    return `Run the Apple Shortcut named "${name || text}" using: shortcuts run "${name || text}". Report what happened. End with [SYSTEM: action="shortcut done"].`;
  }

  // Photo search — ordered by specificity
  if (/(photo|picture|pic|gallery)/.test(lower)) {
    // Check if user is describing WHAT they want to find (vision search)
    const hasDescription = /(with|showing|containing|where|that has|that have|of a|of an|of the|with a|with an)/.test(lower);

    // 1. LATEST: only when explicitly asking for last/latest AND no description
    if (!hasDescription && (/(last|latest|most recent|newest)\s+(photo|picture|pic)/.test(lower) || /^(show|open|display)?\s*(me\s+)?(my\s+)?(photo|picture|pic)s?\s*(from|of|in)?\s*(my\s+)?(gallery|library|camera roll)\s*$/i.test(lower))) {
      return `Show the user their most recent photo from the device library.
End with [PHOTO_QUERY: searchType="latest", limit=1].
Briefly describe that you're showing their latest photo.`;
    }

    // 2. Date-based: "photos from January", "photos from 2024", "photos from last week"
    if (!hasDescription) {
      const dateMatch = lower.match(/(?:photo|picture|pic)s?\s+(?:from|taken|in|on|during)\s+(january|february|march|april|may|june|july|august|september|october|november|december|last\s+week|last\s+month|last\s+year|this\s+week|this\s+month|this\s+year|yesterday|today|\d{4})/i);
      if (dateMatch) {
        const dateStr = dateMatch[1];
        return `The user wants photos from a specific time period: "${text}".
Parse the date "${dateStr}" and determine the start and end dates.
End with [PHOTO_QUERY: from="YYYY-MM-DD", to="YYYY-MM-DD", limit=20].
Tell the user you're showing photos from ${dateStr}.`;
      }
    }

    // 3. VISION SEARCH: any descriptive photo query (uses AI to analyze images)
    // Catches: "photo with F1 car", "photo of Brussels", "photo of Adi", "picture showing sunset"
    if (hasDescription || /(photo|picture|pic)s?\s+(?:i\s+(?:have|took)\s+)?(?:from|of|in|at|with)/.test(lower)) {
      // Extract the search description from the request
      const descMatch = text.match(/(?:photo|picture|pic)s?\s+(?:I\s+have\s+)?(?:in\s+(?:my\s+)?(?:gallery|library|phone)\s+)?(.+)/i);
      let searchDesc = descMatch?.[1] ?? text;
      // Clean up common prefixes
      searchDesc = searchDesc.replace(/^(?:that\s+)?(?:i\s+(?:have|took)\s+)?(?:in\s+(?:my\s+)?(?:gallery|library|phone)\s+)?(?:with|showing|containing|of|from|in|at)\s+/i, '').trim();
      if (searchDesc) {
        return `The user wants to find a specific photo: "${text}".
IMPORTANT: Do NOT use osascript. Do NOT open the Photos app. Do NOT use any tools or commands.
The app has built-in AI vision that will search the phone's photo library automatically.
You MUST only respond with a short message and the marker below. Nothing else.
End with [PHOTO_QUERY: person="${searchDesc}", searchType="name", limit=10].
Say something like "Searching for photos of ${searchDesc}..." and include the marker.`;
      }
    }

    // 4. Generic: "show me my photos", "my pictures", "photo library"
    if (/(icloud photo|my photo|photo library|camera roll|show.*photo|my picture|my gallery)/.test(lower)) {
      return `Show the user their recent photos from the device library.
End with [PHOTO_QUERY: limit=20].
Tell the user you're showing their recent photos.`;
    }
  }

  // Voice Memos
  if (/(voice memo|voice recording|my recordings|record.*memo)/.test(lower)) {
    return `${text}. Use Voice Memos osascript from TOOLS.md. List or open as appropriate. End with [NOTES_RESULT: count=1].`;
  }

  // Find My
  if (/(find my|where.*iphone|where.*mac|locate.*device|lost.*phone)/.test(lower)) {
    return `Open Find My using: open "https://www.icloud.com/find". Tell the user to check their device locations there.`;
  }

  // iWork — Pages, Numbers, Keynote
  if (/(create.*document|new.*document|open.*pages|create.*spreadsheet|new.*keynote|create.*presentation)/.test(lower)) {
    if (/keynote|presentation|slides/.test(lower)) {
      return `Create a new Keynote presentation using: osascript -e 'tell application "Keynote" to make new document'. Confirm opened. End with [SYSTEM: action="keynote opened"].`;
    }
    if (/number|spreadsheet|excel/.test(lower)) {
      return `Create a new Numbers spreadsheet using: osascript -e 'tell application "Numbers" to make new document'. Confirm opened. End with [SYSTEM: action="numbers opened"].`;
    }
    return `Create a new Pages document using: osascript -e 'tell application "Pages" to make new document'. Confirm opened. End with [SYSTEM: action="pages opened"].`;
  }

  // Phone call — "call Mom", "call +31612345678", "call John"
  if (/(^call\s+|phone\s+|dial\s+|ring\s+)/.test(lower)) {
    const target = text.replace(/^(call|phone|dial|ring)\s+/i, '').trim();
    const hasNumber = /[\d+()-]{7,}/.test(target);
    if (hasNumber) {
      const number = target.replace(/[^+\d]/g, '');
      return `The user wants to make a phone call to ${target}.
Open the phone dialer with this number: [PHONE_CALL: number="${number}"]
Confirm you're placing the call.`;
    }
    return `The user wants to call "${target}".
First, look up "${target}" in Contacts using: osascript -e 'tell application "Contacts" to get value of phone 1 of (first person whose name contains "${target}")'
If found, include the phone number: [PHONE_CALL: number="THE_NUMBER"]
If not found, ask the user for the phone number.
Confirm you're placing the call to ${target}.`;
  }

  // Facts, trivia, "who is", "what is", "tell me about" — search the web first
  if (/(who is|who was|what is|what are|what was|tell me about|how does|how do|why is|why do|when did|when was|explain|define|meaning of|fact about|facts about|did you know|search for|look up|google)/.test(lower)) {
    return `The user is asking a factual question: "${text}".
IMPORTANT: Search the web first to get accurate, up-to-date information. Use this command:
curl -s "https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(text)}" | sed 's/<[^>]*>//g' | head -50
Or try: curl -s "https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(text.replace(/^(who is|what is|tell me about|explain|define)\s+/i, ''))}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('extract',''))"
Give a clear, concise answer based on what you find. If the question is about current events or recent news, prioritize the web search results.
Do NOT make up facts. If you can't find reliable information, say so.`;
  }

  return text;
}

// ─── Thinking stages ──────────────────────────────────────────────────────────
const THINKING_STAGES = [
  { after: 0,  label: 'Thinking...' },
  { after: 5,  label: 'Working on it...' },
  { after: 12, label: 'Running commands...' },
  { after: 25, label: 'Almost done...' },
  { after: 45, label: 'Still working...' },
];

// ─── Main component ───────────────────────────────────────────────────────────
export default function VoiceScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [orbState, setOrbState] = useState<OrbState>('idle');
  const [currentCard, setCurrentCard] = useState<CardData | null>(null);
  const [userTranscript, setUserTranscript] = useState('');
  const [assistantText, setAssistantText] = useState('');
  const [thinkingLabel, setThinkingLabel] = useState('Thinking...');
  const thinkingStartRef = useRef<number>(0);
  const thinkingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const handledResponseRef = useRef<string | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [actionStatus, setActionStatus] = useState<ActionStatus | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionProvider, setActionProvider] = useState<string | null>(null);
  const [actionData, setActionData] = useState<Record<string, unknown> | null>(null);
  const [pendingAction, setPendingAction] = useState<ActionPayload | null>(null);
  const [clarificationFields, setClarificationFields] = useState<ReturnType<typeof getMissingFields>>([]);
  const clarificationRef = useRef<BottomSheet>(null);
  const settingsRef = useRef<AppSettings>(DEFAULT_SETTINGS);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const messagesRef = useRef<ConversationMessage[]>([]);

  // Keep messagesRef in sync for use inside callbacks
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  useEffect(() => {
    // Load existing conversation history on mount
    getConversations().then(setMessages);
    loadSettings().then((s) => {
      setSettings(s);
      settingsRef.current = s;
      // Initialize GPS location
      if (s.useGpsLocation) {
        getCurrentLocation().then((loc) => {
          if (loc) {
            setUserLocation(loc);
            const locStr = loc.formattedAddress ?? `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`;
            const profile = buildProfileContext(s, locStr);
            if (profile) openClawClient.setProfileContext(profile);
          }
        });
      }
    });
  }, []);

  // Reload settings when tab gains focus (picks up Zoom/Microsoft tokens saved in Settings)
  useFocusEffect(
    useCallback(() => {
      loadSettings().then((s) => {
        setSettings(s);
        settingsRef.current = s;
      });
    }, [])
  );

  // ── Thinking label timer ──────────────────────────────────────────────────
  useEffect(() => {
    if (orbState === 'thinking') {
      thinkingStartRef.current = Date.now();
      setThinkingLabel('Thinking...');
      thinkingTimerRef.current = setInterval(() => {
        const elapsed = (Date.now() - thinkingStartRef.current) / 1000;
        const stage = [...THINKING_STAGES].reverse().find(s => elapsed >= s.after);
        if (stage) setThinkingLabel(stage.label);
      }, 1000);
    } else {
      if (thinkingTimerRef.current) {
        clearInterval(thinkingTimerRef.current);
        thinkingTimerRef.current = null;
      }
    }
    return () => { if (thinkingTimerRef.current) clearInterval(thinkingTimerRef.current); };
  }, [orbState]);

  const { send, streamingText, lastMessage, status } = useOpenClaw({
    url: settings.gatewayUrl,
    token: settings.authToken,
    session: settings.sessionKey,
  });

  const tts = useTTS(settings);

  useEffect(() => {
    if (tts.state === 'idle' && orbState === 'speaking') {
      setOrbState('done');
      haptics.success();
      const t = setTimeout(() => setOrbState('idle'), 1200);
      return () => clearTimeout(t);
    }
  }, [tts.state]);

  const voice = useVoiceInput({
    settings,
    onTranscript: useCallback(
      (text: string) => {
        if (!text.trim()) { setOrbState('idle'); return; }
        const expanded = expandSpecialPhrase(text, userLocation?.city ?? undefined);

        // Prepend recent conversation context so the AI understands follow-ups
        // like "email Marine about this meeting" or "delete that event"
        const context = buildConversationContext(messagesRef.current);
        const messageWithContext = context
          ? `[CONVERSATION CONTEXT - use this when the user refers to something discussed earlier]\n${context}\n[/CONVERSATION CONTEXT]\n\n${expanded}`
          : expanded;

        setUserTranscript(text);
        setAssistantText('');
        setOrbState('thinking');
        setCurrentCard(null);
        handledResponseRef.current = null;
        // Save user message to conversation store
        addMessage('user', text).then((msg) =>
          setMessages((prev) => [...prev, msg])
        );
        send(messageWithContext);
      },
      [send, userLocation]
    ),
  });

  useEffect(() => {
    if (voice.state === 'recording') setOrbState('recording');
    else if (voice.state === 'processing') setOrbState('thinking');
  }, [voice.state]);

  useEffect(() => {
    if (streamingText) setAssistantText(streamingText);
  }, [streamingText]);

  // ── Action execution helper ──────────────────────────────────────────────
  const runAction = useCallback(async (action: ActionPayload) => {
    setActionStatus('executing');
    setActionError(null);
    setActionProvider(null);
    setActionData(null);
    try {
      const result = await executeAction(action, settingsRef.current);
      if (result.success) {
        setActionStatus('success');
        setActionProvider(result.provider ?? null);
        setActionData(result.data ?? null);
        haptics.success();
        // Store meeting links locally + auto-send email if sendTo was specified
        if (action.actionType === 'create_meeting' && result.data?.joinUrl) {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          const joinUrl = result.data.joinUrl as string;
          const subject = action.meetingSubject ?? 'Meeting';
          const meetingRecord = {
            joinUrl,
            subject,
            startTime: action.meetingStartTime,
            createdAt: new Date().toISOString(),
          };
          AsyncStorage.setItem('@claw_last_meeting', JSON.stringify(meetingRecord)).catch(() => {});

          // Auto-send email with the actual join link via gateway osascript
          const recipient = action.sendTo || settingsRef.current.userEmail;
          if (recipient) {
            const emailBody = `Hi,\\n\\nHere is the Zoom meeting link:\\n${joinUrl}\\n\\nTopic: ${subject}\\nTime: ${action.meetingStartTime ?? 'See invite'}\\n\\nBest regards`;
            const emailSubject = `Zoom Meeting Link - ${subject}`;
            openClawClient.send(
              `Send this email NOW using osascript. Do NOT open any compose window. Execute this exact command:\nosascript -e 'tell application "Mail"\nset newMsg to make new outgoing message with properties {subject:"${emailSubject}", content:"${emailBody}", visible:false}\ntell newMsg\nmake new to recipient at end of to recipients with properties {address:"${recipient}"}\nend tell\nsend newMsg\nend tell'\nAfter sending, just confirm briefly: "Meeting link emailed to ${recipient}."`,
              settingsRef.current.sessionKey,
            );
          }
        }
      } else {
        setActionStatus('error');
        setActionError(result.error ?? 'Action failed');
      }
    } catch (e: unknown) {
      setActionStatus('error');
      setActionError(e instanceof Error ? e.message : 'Action failed');
    }
  }, []);

  useEffect(() => {
    if (!lastMessage) return;
    if (handledResponseRef.current === lastMessage) return;
    if (orbState !== 'thinking') return;
    handledResponseRef.current = lastMessage;
    const card = parseResponse(lastMessage);
    setAssistantText(lastMessage);
    setCurrentCard(card);
    setOrbState('speaking');
    setActionStatus(null);
    setActionError(null);
    setActionProvider(null);
    setActionData(null);
    tts.speak(lastMessage);
    // Save assistant message to conversation store
    addMessage('assistant', lastMessage, card).then((msg) =>
      setMessages((prev) => [...prev, msg])
    );

    // Check for phone call marker — open dialer on the phone
    if (card.metadata?.phoneNumber) {
      const Linking = require('expo-linking');
      Linking.openURL(`tel:${card.metadata.phoneNumber}`).catch(() => {});
    }

    // Check for executable action
    const action = card.metadata?.action as ActionPayload | undefined;
    if (action) {
      const missing = getMissingFields(action);
      if (missing.length > 0) {
        // Show clarification dialog
        setPendingAction(action);
        setClarificationFields(missing);
        setTimeout(() => clarificationRef.current?.snapToIndex(0), 500);
      } else {
        // Execute immediately (non-blocking, after card renders)
        runAction(action);
      }
    }
  }, [lastMessage, runAction]);

  const handleClarificationConfirm = useCallback((updatedAction: ActionPayload) => {
    clarificationRef.current?.close();
    setPendingAction(null);
    setClarificationFields([]);
    runAction(updatedAction);
  }, [runAction]);

  const handleClarificationCancel = useCallback(() => {
    clarificationRef.current?.close();
    setPendingAction(null);
    setClarificationFields([]);
  }, []);

  const handleOrbPress = useCallback(async () => {
    if (orbState === 'recording') {
      haptics.medium();
      voice.stopRecording();
    } else if (orbState === 'idle' || orbState === 'done') {
      haptics.light();
      // Keep previous card visible until new response arrives
      setActionStatus(null);
      setActionError(null);
      setActionProvider(null);
      await voice.startRecording();
    }
  }, [orbState, voice]);

  const handleOrbLongPress = useCallback(async () => {
    if (orbState !== 'idle' && orbState !== 'done') return;
    haptics.medium();
    setActionStatus(null);
    setActionError(null);
    setActionProvider(null);
    await voice.startRecording();
  }, [orbState, voice]);

  const showIdle = !userTranscript && !assistantText && !currentCard && orbState === 'idle';
  const statusLabel =
    orbState === 'recording' ? 'Listening...' :
    orbState === 'thinking'  ? (streamingText ? 'Responding...' : thinkingLabel) :
    orbState === 'speaking'  ? 'Speaking...' :
    orbState === 'done'      ? 'Done' :
    '';

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* Minimal header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <StatusDot status={status} />
          <Text style={styles.appName}>Claw</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/settings')} style={styles.settingsBtn}>
          <GearIcon size={18} color={Colors.textTertiary} strokeWidth={1.8} />
        </TouchableOpacity>
      </View>

      {/* Content — scrollable middle area */}
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {showIdle ? (
          <Text style={styles.idlePrompt}>Tap the orb{'\n'}to speak</Text>
        ) : (
          <>
            {/* User transcript */}
            {userTranscript ? (
              <Text style={styles.userText}>{userTranscript}</Text>
            ) : null}

            {/* AI response — TTS reads it aloud, no text displayed */}

            {/* Streaming preview */}
            {streamingText && orbState === 'thinking' ? (
              <Text style={styles.streamingText} numberOfLines={3}>
                {streamingText}
              </Text>
            ) : null}

            {/* Action card */}
            {currentCard && orbState !== 'thinking' ? (
              <View style={styles.cardArea}>
                <CardEngine
                  card={currentCard}
                  actionStatus={actionStatus}
                  actionError={actionError}
                  actionProvider={actionProvider}
                  actionData={actionData}
                />
              </View>
            ) : null}
          </>
        )}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Orb area — always at bottom */}
      <View style={styles.orbArea}>
        {statusLabel ? (
          <Text style={styles.statusLabel}>{statusLabel}</Text>
        ) : null}
        <Pressable
          onPress={handleOrbPress}
          onLongPress={handleOrbLongPress}
          style={styles.orbPressable}
        >
          <VoiceOrb orbState={orbState} audioLevel={voice.audioLevel} />
        </Pressable>
      </View>

      {/* Clarification bottom sheet */}
      {pendingAction && clarificationFields.length > 0 && (
        <ClarificationDialog
          sheetRef={clarificationRef}
          action={pendingAction}
          missingFields={clarificationFields}
          onConfirm={handleClarificationConfirm}
          onCancel={handleClarificationCancel}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appName: {
    fontFamily: 'Syne_700Bold',
    fontSize: 18,
    color: Colors.text,
    letterSpacing: 0.3,
  },
  settingsBtn: {
    padding: 4,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingTop: 20,
  },
  idlePrompt: {
    fontFamily: 'Syne_400Regular',
    fontSize: 22,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 32,
    marginTop: 60,
  },
  userText: {
    fontFamily: 'Syne_400Regular',
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 24,
    marginBottom: 20,
  },
  streamingText: {
    fontFamily: 'Syne_400Regular',
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 24,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  cardArea: {
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  bottomSpacer: {
    height: 220,
  },

  // Orb fixed to bottom
  orbArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 16,
  },
  statusLabel: {
    fontFamily: 'Syne_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  orbPressable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

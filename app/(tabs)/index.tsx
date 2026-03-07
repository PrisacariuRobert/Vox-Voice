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
import { useRouter } from 'expo-router';

import { VoiceOrb } from '../../components/VoiceOrb';
import { StatusDot } from '../../components/StatusDot';
import { CardEngine } from '../../components/ActionCards/CardEngine';

import { useOpenClaw } from '../../hooks/useOpenClaw';
import { useTTS } from '../../hooks/useTTS';
import { useVoiceInput } from '../../hooks/useVoiceInput';

import { loadSettings } from './settings';
import { parseResponse } from '../../lib/card-parser';
import { haptics } from '../../lib/audio-utils';

import { Colors } from '../../constants/colors';
import { AppSettings, OrbState, CardData } from '../../types';
import { DEFAULT_SETTINGS } from './settings';

// ─── Special phrase expansion ─────────────────────────────────────────────────
function expandSpecialPhrase(text: string): string {
  const lower = text.toLowerCase().trim();

  // Morning briefing
  if (/^(good morning|morning|morning briefing|give me a briefing|my briefing|briefing)/.test(lower)) {
    return `Give me my morning briefing right now. Do ALL of these steps in order without asking:
1. Run: date
2. Read today's calendar events via osascript (Apple Calendar, all calendars)
3. Read my top 3 inbox emails via Apple Mail osascript (sender + subject only)
4. Get weather: curl -s "wttr.in/Amsterdam?format=3"
Speak everything as a warm, concise personal assistant briefing. End with [BRIEFING].`;
  }

  // Today's schedule
  if (/(what.*today|today.*schedule|my schedule|my events|my calendar today)/.test(lower)) {
    return `Read today's calendar events using Apple Calendar osascript and tell me what I have today. End with [CALENDAR_EVENTS].`;
  }

  // Read emails
  if (/(read.*email|check.*email|check.*inbox|my emails|my inbox|latest email|last.*email)/.test(lower)) {
    return `Read my last 3 inbox emails using Apple Mail osascript. For each one tell me who it's from and the subject. Then offer to read the full body of any of them.`;
  }

  // Apple Music — play song / control
  if (/(apple music|on.*my.*library|from.*my.*library)/.test(lower)) {
    const songMatch = lower.match(/play\s+(.+?)(?:\s+on|\s+from|\s+in|$)/);
    if (songMatch) {
      return `Play "${songMatch[1]}" on Apple Music using the osascript search-and-play heredoc from TOOLS.md. End with [NOW_PLAYING: title="SONG", artist="ARTIST", album="ALBUM", source="Apple Music"].`;
    }
    return `${text} — use Apple Music (Music app) osascript from TOOLS.md. End with [NOW_PLAYING: title="SONG", artist="ARTIST", album="ALBUM", source="Apple Music"].`;
  }

  // What's playing — Apple Music only
  if (/(what.*playing|what.*song|current.*track|what.*music|now playing)/.test(lower)) {
    return `Check what's currently playing on Apple Music using: osascript -e 'tell application "Music" to return name of current track & " by " & artist of current track & " from " & album of current track'
Tell me what's playing and end with [NOW_PLAYING: title="SONG", artist="ARTIST", album="ALBUM", source="Apple Music"].`;
  }

  // Generic play music — always use Apple Music
  if (/^play\s+(.+)/.test(lower) && !/(podcast|episode)/.test(lower)) {
    const songMatch = lower.match(/^play\s+(.+)/);
    const query = songMatch?.[1] ?? text;
    return `Play "${query}" on Apple Music using the osascript search-and-play heredoc from TOOLS.md. End with [NOW_PLAYING: title="SONG", artist="ARTIST", album="ALBUM", source="Apple Music"].`;
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

  // Alarm
  if (/(set.*alarm|wake.*me.*at|alarm.*for|alarm.*at)/.test(lower)) {
    const timeMatch = text.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i);
    const time = timeMatch?.[1] ?? 'specified time';
    return `Set an alarm for ${time}. Use the \`at\` command or Apple Shortcuts from TOOLS.md. Confirm. End with [ALARM: time="${time}"].`;
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

  // Weather detailed
  if (/(weather|forecast|temperature|will it rain|going to rain|sunny|what.*outside)/.test(lower)) {
    return `Get the weather for Amsterdam using: curl -s "wttr.in/Amsterdam?format=%C,+%t,+feels+like+%f,+humidity+%h,+wind+%w"
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

  // iCloud Photos
  if (/(icloud photo|my photo|photo library|camera roll)/.test(lower)) {
    return `Open Photos app and get recent photos info using Apple Photos osascript from TOOLS.md. Tell me what you find. Show [PHOTO_QUERY: limit=20].`;
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

  useEffect(() => { loadSettings().then(setSettings); }, []);

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
        const expanded = expandSpecialPhrase(text);
        setUserTranscript(text);
        setAssistantText('');
        setOrbState('thinking');
        setCurrentCard(null);
        handledResponseRef.current = null;
        send(expanded);
      },
      [send]
    ),
  });

  useEffect(() => {
    if (voice.state === 'recording') setOrbState('recording');
    else if (voice.state === 'processing') setOrbState('thinking');
  }, [voice.state]);

  useEffect(() => {
    if (streamingText) setAssistantText(streamingText);
  }, [streamingText]);

  useEffect(() => {
    if (!lastMessage) return;
    if (handledResponseRef.current === lastMessage) return;
    if (orbState !== 'thinking') return;
    handledResponseRef.current = lastMessage;
    const card = parseResponse(lastMessage);
    setAssistantText(lastMessage);
    setCurrentCard(card);
    setOrbState('speaking');
    tts.speak(lastMessage);
  }, [lastMessage]);

  const handleOrbPress = useCallback(async () => {
    if (orbState === 'recording') {
      haptics.medium();
      voice.stopRecording();
    } else if (orbState === 'idle' || orbState === 'done') {
      haptics.light();
      setUserTranscript('');
      setAssistantText('');
      setCurrentCard(null);
      await voice.startRecording();
    }
  }, [orbState, voice]);

  const handleOrbLongPress = useCallback(async () => {
    if (orbState !== 'idle' && orbState !== 'done') return;
    haptics.medium();
    setUserTranscript('');
    setAssistantText('');
    setCurrentCard(null);
    await voice.startRecording();
  }, [orbState, voice]);

  const showIdle = !userTranscript && !assistantText && orbState === 'idle';
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
          <Text style={styles.settingsIcon}>⚙</Text>
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

            {/* AI response — large bold text like the screenshot */}
            {assistantText && orbState !== 'thinking' ? (
              <Text style={styles.assistantText}>{assistantText}</Text>
            ) : null}

            {/* Streaming preview */}
            {streamingText && orbState === 'thinking' ? (
              <Text style={styles.streamingText} numberOfLines={3}>
                {streamingText}
              </Text>
            ) : null}

            {/* Action card */}
            {currentCard && orbState !== 'thinking' ? (
              <View style={styles.cardArea}>
                <CardEngine card={currentCard} />
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
  settingsIcon: {
    fontSize: 18,
    color: Colors.textTertiary,
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
  assistantText: {
    fontFamily: 'Syne_700Bold',
    fontSize: 28,
    color: Colors.text,
    lineHeight: 38,
    marginBottom: 24,
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

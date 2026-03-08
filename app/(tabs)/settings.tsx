import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/colors';

// Lazy-load native modules
let AuthSession: typeof import('expo-auth-session') | null = null;
try { AuthSession = require('expo-auth-session'); } catch { /* needs rebuild */ }
import { AppSettings } from '../../types';
import { openClawClient } from '../../lib/openclaw-client';
import {
  exchangeCodeForTokens,
  getMicrosoftDiscovery,
  getMicrosoftScopes,
  getMicrosoftUserEmail,
} from '../../lib/microsoft-auth';
import {
  getServerToServerToken,
  getZoomUserEmail,
  signOut as zoomSignOut,
} from '../../lib/zoom-auth';
import {
  DEFAULT_GATEWAY_URL,
  DEFAULT_AUTH_TOKEN,
  DEFAULT_KOKORO_URL,
  DEFAULT_KOKORO_VOICE,
  DEFAULT_SESSION_KEY,
  DEFAULT_WAKE_PHRASES,
} from '../../constants/config';

export const SETTINGS_KEY = '@claw_settings';

export const DEFAULT_SETTINGS: AppSettings = {
  gatewayUrl: DEFAULT_GATEWAY_URL,
  authToken: DEFAULT_AUTH_TOKEN,
  sessionKey: DEFAULT_SESSION_KEY,
  userName: '',
  userEmail: '',
  userTimezone: 'Europe/Amsterdam',
  userCalendar: 'apple',
  userEmailApp: 'apple',
  useGpsLocation: true,
  wakePhrases: DEFAULT_WAKE_PHRASES,
  ttsProvider: 'openai',
  openaiTtsVoice: 'nova',
  kokoroUrl: DEFAULT_KOKORO_URL,
  kokoroApiKey: '',
  kokoroVoice: DEFAULT_KOKORO_VOICE,
  googleTtsApiKey: '',
  whisperApiKey: '',
  sttProvider: 'whisper',
  connectedServices: {},
  microsoftClientId: '',
  microsoftAccessToken: '',
  microsoftRefreshToken: '',
  microsoftTokenExpiry: 0,
  microsoftUserEmail: '',
  // Zoom (Server-to-Server OAuth)
  zoomAccountId: '',
  zoomClientId: '',
  zoomClientSecret: '',
  zoomAccessToken: '',
  zoomRefreshToken: '',
  zoomTokenExpiry: 0,
  zoomUserEmail: '',
};

export function buildProfileContext(
  settings: AppSettings,
  locationStr?: string,
): string {
  if (!settings.userName) return '';
  const connected = Object.entries(settings.connectedServices ?? {})
    .filter(([, v]) => v)
    .map(([k]) => k)
    .join(', ');
  const calLabel = settings.userCalendar === 'apple' ? 'Apple Calendar' : settings.userCalendar === 'google' ? 'Google Calendar' : 'Outlook Calendar';
  const emailLabel = settings.userEmailApp === 'apple' ? 'Apple Mail' : settings.userEmailApp === 'gmail' ? 'Gmail' : 'Outlook';
  const lines = [
    `Name: ${settings.userName}`,
    settings.userEmail ? `Email: ${settings.userEmail}` : null,
    `Timezone: ${settings.userTimezone}`,
    locationStr ? `Location: ${locationStr}` : null,
    `Preferred calendar: ${calLabel}`,
    `Preferred email: ${emailLabel}`,
    settings.microsoftUserEmail ? `Microsoft account: ${settings.microsoftUserEmail} (Outlook email and calendar available)` : null,
    settings.zoomUserEmail ? `Zoom account: ${settings.zoomUserEmail} (meetings available via Zoom API)` : null,
    connected ? `Connected services (logged in on Mac): ${connected}` : null,
    '',
    'CRITICAL — ACTION INSTRUCTIONS (you MUST follow these):',
    'You are running on a MOBILE app connected to a Mac gateway. You have direct API access to create/edit/delete calendar events and schedule Zoom meetings.',
    'For CALENDAR and MEETINGS: ALWAYS use [ACTION:] markers. The app will execute them automatically via APIs.',
    'For EMAIL: Use osascript via the Mac gateway to send emails through Apple Mail. Do NOT use [ACTION:send_email].',
    'NEVER tell the user to open an app manually. NEVER say "opening Zoom/Outlook/Calendar".',
    '',
    'EMAIL — send via osascript (this actually sends the email):',
    'osascript -e \'tell application "Mail"\nset newMsg to make new outgoing message with properties {subject:"SUBJECT", content:"BODY", visible:false}\ntell newMsg\nmake new to recipient at end of to recipients with properties {address:"EMAIL"}\nend tell\nsend newMsg\nend tell\'',
    'End with [EMAIL_SENT] after sending.',
    '',
    'CALENDAR/MEETINGS — use [ACTION:] markers:',
    '[ACTION:create_event title="Event Name" startTime="2024-01-15T10:00:00" endTime="2024-01-15T11:00:00" location="Place" attendees="a@b.com"]',
    '[ACTION:update_event searchTitle="Current Event Name" title="New Title" startTime="2024-01-15T14:00:00" endTime="2024-01-15T15:00:00" location="New Place"]',
    '[ACTION:delete_event searchTitle="Event Name To Find And Delete"]',
    '[ACTION:create_meeting meetingSubject="Meeting Name" meetingStartTime="2024-01-15T14:00:00" meetingEndTime="2024-01-15T15:00:00"]',
    '',
    'ALARMS — use [ACTION:] markers:',
    '[ACTION:set_alarm alarmTime="07:00" alarmLabel="Alarm"] — time MUST be HH:MM 24h format',
    '[ACTION:cancel_alarm] — cancels all active alarms',
    '',
    'PHONE CALLS — use [PHONE_CALL:] marker:',
    '[PHONE_CALL: number="+31612345678"] — opens the phone dialer on the device',
    '',
    'NOTES — create via osascript:',
    'osascript -e \'tell application "Notes" to tell account "iCloud" to make new note at folder "Notes" with properties {name:"Title", body:"<html><body>Content</body></html>"}\'',
    '',
    'You MUST include exactly ONE [ACTION:] marker when the user asks to create/edit/delete events, schedule meetings, or set/cancel alarms.',
    'If unsure about required details (recipient, time, subject), ASK the user first.',
    'The [ACTION:create_meeting] creates a real Zoom meeting via the Zoom API and returns a join link. Do NOT suggest opening Zoom manually.',
    'The [ACTION:update_event] searches for an event by searchTitle and updates only the fields you specify. Use for reschedule, rename, move, etc.',
    'The [ACTION:delete_event] searches for and deletes a calendar event by title. Use it when the user asks to cancel, delete, or remove an event.',
    'For factual questions, ALWAYS search the web first before answering. Do not make up facts.',
  ].filter(Boolean);
  return lines.join('\n');
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  // Update live profile context so current session knows the user
  const profile = buildProfileContext(settings);
  if (profile) openClawClient.setProfileContext(profile);
}

export async function loadSettings(): Promise<AppSettings> {
  try {
    const json = await AsyncStorage.getItem(SETTINGS_KEY);
    if (json) {
      const saved = JSON.parse(json);
      // Backfill defaults for fields that were saved as empty strings
      if (!saved.authToken) saved.authToken = DEFAULT_AUTH_TOKEN;
      const settings = { ...DEFAULT_SETTINGS, ...saved };
      const profile = buildProfileContext(settings);
      if (profile) openClawClient.setProfileContext(profile);
      return settings;
    }
  } catch {}
  return DEFAULT_SETTINGS;
}

// ─── Field components ─────────────────────────────────────────────────────────

function Section({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoCapitalize,
  keyboardType,
  hint,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words';
  keyboardType?: 'default' | 'url' | 'email-address';
  hint?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textTertiary}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize ?? 'none'}
        autoCorrect={false}
        keyboardType={keyboardType ?? 'default'}
        selectionColor={Colors.accent}
      />
      {hint ? <Text style={styles.hintText}>{hint}</Text> : null}
    </View>
  );
}

function SegmentedControl({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { key: string; label: string }[];
  value: string;
  onChange: (k: string) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.segmented}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.segment, value === opt.key && styles.segmentActive]}
            onPress={() => onChange(opt.key)}
          >
            <Text style={[styles.segmentText, value === opt.key && styles.segmentTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ─── Service definitions ──────────────────────────────────────────────────────

const BUILT_IN_SERVICES = [
  { id: 'apple',    name: 'Apple Calendar & Reminders', desc: 'Events, reminders via macOS' },
  { id: 'music',    name: 'Apple Music',                desc: 'Play music via Music app' },
  { id: 'web',      name: 'Web Search & Browse',        desc: 'Search the web, read pages' },
  { id: 'shell',    name: 'Run Mac Commands',           desc: 'Execute any shell command' },
];

const CONNECTABLE_SERVICES = [
  { id: 'google',   name: 'Google',           desc: 'Gmail + Google Calendar',   color: '#4285F4', macCmd: 'open https://accounts.google.com' },
  { id: 'youtube',  name: 'YouTube',          desc: 'Watch & search videos',      color: '#FF0000', macCmd: 'open https://youtube.com' },
];

function BuiltInServiceRow({ name, description }: { name: string; description: string }) {
  return (
    <View style={styles.serviceRow}>
      <View style={[styles.serviceDot, styles.serviceDotReady]} />
      <View style={styles.serviceText}>
        <Text style={styles.serviceName}>{name}</Text>
        <Text style={styles.serviceDesc}>{description}</Text>
      </View>
      <Text style={styles.serviceReadyLabel}>Ready</Text>
    </View>
  );
}

function ConnectableServiceRow({
  service,
  connected,
  onConnect,
  onDisconnect,
}: {
  service: typeof CONNECTABLE_SERVICES[number];
  connected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  return (
    <View style={styles.serviceRow}>
      <View style={[styles.serviceDot, { backgroundColor: service.color }]} />
      <View style={styles.serviceText}>
        <Text style={styles.serviceName}>{service.name}</Text>
        <Text style={styles.serviceDesc}>{service.desc}</Text>
      </View>
      {connected ? (
        <TouchableOpacity onPress={onDisconnect} style={styles.disconnectBtn}>
          <Text style={styles.disconnectBtnText}>Connected</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={onConnect} style={styles.connectBtn}>
          <Text style={styles.connectBtnText}>Connect</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  const update = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((s) => ({ ...s, [key]: value }));
    setSaved(false);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSettings(settings);
      setSaved(true);
      Alert.alert('Saved', 'Settings saved. Claw now knows your profile.');
    } catch {
      Alert.alert('Error', 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    Alert.alert('Reset Settings', 'Restore all settings to defaults?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          setSettings(DEFAULT_SETTINGS);
          setSaved(false);
        },
      },
    ]);
  };

  const handleConnect = useCallback((svc: typeof CONNECTABLE_SERVICES[number]) => {
    // Ask Claw to open the service on Mac (best-effort — works if socket is connected)
    try {
      openClawClient.send(
        `Please open ${svc.name} on my Mac so I can log in. Run: ${svc.macCmd}`,
        settings.sessionKey || 'main'
      );
    } catch {
      // ignore if not connected yet
    }
    Alert.alert(
      `Connect ${svc.name}`,
      `Open ${svc.name} on your Mac and log in.\n\nMac command:\n${svc.macCmd}\n\nOnce logged in, tap "Done".`,
      [
        {
          text: 'Done — Connected',
          onPress: () => {
            setSettings((s) => ({
              ...s,
              connectedServices: { ...s.connectedServices, [svc.id]: true },
            }));
            setSaved(false);
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, [settings.sessionKey]);

  const handleDisconnect = useCallback((id: string) => {
    Alert.alert('Disconnect', 'Remove this service connection?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: () => {
          setSettings((s) => ({
            ...s,
            connectedServices: { ...s.connectedServices, [id]: false },
          }));
          setSaved(false);
        },
      },
    ]);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <TouchableOpacity onPress={handleReset}>
          <Text style={styles.resetBtn}>Reset</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* ── User Profile ── */}
        <Section
          title="Your Profile"
          subtitle="Claw uses this to personalize responses and know your preferences."
        />
        <Field
          label="Your Name"
          value={settings.userName}
          onChangeText={(v) => update('userName', v)}
          placeholder="Roberto"
          autoCapitalize="words"
        />
        <Field
          label="Your Email"
          value={settings.userEmail}
          onChangeText={(v) => update('userEmail', v)}
          placeholder="you@gmail.com"
          keyboardType="email-address"
        />
        <Field
          label="Timezone"
          value={settings.userTimezone}
          onChangeText={(v) => update('userTimezone', v)}
          placeholder="Europe/Amsterdam"
        />
        <SegmentedControl
          label="Preferred Calendar"
          options={[
            { key: 'apple', label: 'Apple' },
            { key: 'google', label: 'Google' },
            { key: 'outlook', label: 'Outlook' },
          ]}
          value={settings.userCalendar}
          onChange={(v) => update('userCalendar', v)}
        />
        <SegmentedControl
          label="Preferred Email"
          options={[
            { key: 'gmail', label: 'Gmail' },
            { key: 'apple', label: 'Apple Mail' },
            { key: 'outlook', label: 'Outlook' },
          ]}
          value={settings.userEmailApp}
          onChange={(v) => update('userEmailApp', v)}
        />
        <SegmentedControl
          label="Use GPS Location"
          options={[
            { key: 'on', label: 'On' },
            { key: 'off', label: 'Off' },
          ]}
          value={settings.useGpsLocation ? 'on' : 'off'}
          onChange={(v) => update('useGpsLocation', v === 'on')}
        />

        {/* ── Microsoft Account ── */}
        <Section
          title="Microsoft Account"
          subtitle="Sign in with a Microsoft 365 work/school account for Outlook email and calendar."
        />
        {settings.microsoftUserEmail ? (
          <View style={styles.serviceRow}>
            <View style={[styles.serviceDot, styles.serviceDotReady]} />
            <View style={styles.serviceText}>
              <Text style={styles.serviceName}>{settings.microsoftUserEmail}</Text>
              <Text style={styles.serviceDesc}>Outlook email &amp; calendar</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                update('microsoftAccessToken', '');
                update('microsoftRefreshToken', '');
                update('microsoftTokenExpiry', 0);
                update('microsoftUserEmail', '');
              }}
              style={styles.disconnectBtn}
            >
              <Text style={styles.disconnectBtnText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Field
              label="Azure Client ID"
              value={settings.microsoftClientId}
              onChangeText={(v) => update('microsoftClientId', v)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              hint="From Azure Portal → App Registrations"
            />
            {settings.microsoftClientId && AuthSession ? (
              <TouchableOpacity
                style={styles.redirectUriBtn}
                onPress={() => {
                  const uri = AuthSession!.makeRedirectUri({
                    scheme: 'clawvoice',
                    path: 'auth',
                  });
                  Alert.alert(
                    'Redirect URI',
                    `Add this exact URI in Azure Portal → App Registrations → Authentication → Mobile/Desktop redirect URIs:\n\n${uri}`,
                  );
                }}
              >
                <Text style={styles.redirectUriBtnText}>Show Redirect URI for Azure</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={[styles.msSignInBtn, !settings.microsoftClientId && styles.saveBtnDisabled]}
              onPress={async () => {
                if (!settings.microsoftClientId) {
                  Alert.alert('Missing Client ID', 'Enter your Azure Client ID first.');
                  return;
                }
                try {
                  if (!AuthSession) {
                    Alert.alert('Not Available', 'Rebuild the app first: npx expo run:ios');
                    return;
                  }
                  const discovery = getMicrosoftDiscovery();
                  const redirectUri = AuthSession.makeRedirectUri({
                    scheme: 'clawvoice',
                    path: 'auth',
                  });
                  console.log('[OAuth] Redirect URI:', redirectUri);
                  const request = new AuthSession.AuthRequest({
                    clientId: settings.microsoftClientId,
                    scopes: getMicrosoftScopes(),
                    redirectUri,
                    usePKCE: true,
                    responseType: AuthSession.ResponseType.Code,
                  });
                  await request.makeAuthUrlAsync(discovery);
                  const result = await request.promptAsync(discovery);
                  if (result.type === 'success' && result.params.code) {
                    const tokens = await exchangeCodeForTokens(
                      result.params.code,
                      settings.microsoftClientId,
                      redirectUri,
                      request.codeVerifier!,
                    );
                    const email = await getMicrosoftUserEmail(tokens.accessToken);
                    const updatedSettings = {
                      ...settings,
                      microsoftAccessToken: tokens.accessToken,
                      microsoftRefreshToken: tokens.refreshToken,
                      microsoftTokenExpiry: tokens.expiresAt,
                      microsoftUserEmail: email,
                    };
                    setSettings(updatedSettings);
                    setSaved(false);
                    // Auto-save so Voice screen picks up the tokens immediately
                    await saveSettings(updatedSettings);
                    Alert.alert('Success', `Signed in as ${email}`);
                  }
                } catch (e: unknown) {
                  const msg = e instanceof Error ? e.message : 'Unknown error';
                  const uri = AuthSession!.makeRedirectUri({ scheme: 'clawvoice', path: 'auth' });
                  if (msg.includes('redirect') || msg.includes('invalid_request')) {
                    Alert.alert(
                      'Redirect URI Mismatch',
                      `Azure rejected the redirect URI. In Azure Portal → App Registrations → Authentication, add this as a "Mobile and desktop" redirect URI:\n\n${uri}`,
                    );
                  } else {
                    Alert.alert('Sign-in Failed', msg);
                  }
                }
              }}
              disabled={!settings.microsoftClientId}
            >
              <Text style={styles.saveBtnText}>Sign in with Microsoft</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── Zoom Account ── */}
        <Section
          title="Zoom Account"
          subtitle="Create a Server-to-Server OAuth app in Zoom Marketplace to enable meeting creation."
        />
        {settings.zoomUserEmail ? (
          <View style={styles.serviceRow}>
            <View style={[styles.serviceDot, { backgroundColor: '#2D8CFF' }]} />
            <View style={styles.serviceText}>
              <Text style={styles.serviceName}>{settings.zoomUserEmail}</Text>
              <Text style={styles.serviceDesc}>Zoom meetings</Text>
            </View>
            <TouchableOpacity
              onPress={async () => {
                await zoomSignOut();
                update('zoomAccessToken', '');
                update('zoomRefreshToken', '');
                update('zoomTokenExpiry', 0);
                update('zoomUserEmail', '');
              }}
              style={styles.disconnectBtn}
            >
              <Text style={styles.disconnectBtnText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Field
              label="Account ID"
              value={settings.zoomAccountId}
              onChangeText={(v) => update('zoomAccountId', v)}
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxx"
              hint="Zoom Marketplace → Build App → Server-to-Server OAuth → Account ID"
            />
            <Field
              label="Client ID"
              value={settings.zoomClientId}
              onChangeText={(v) => update('zoomClientId', v)}
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxx"
            />
            <Field
              label="Client Secret"
              value={settings.zoomClientSecret}
              onChangeText={(v) => update('zoomClientSecret', v)}
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxx"
              secureTextEntry
            />
            <TouchableOpacity
              style={styles.redirectUriBtn}
              onPress={() => {
                Alert.alert(
                  'How to set up Zoom',
                  '1. Go to marketplace.zoom.us\n2. Click "Build App" → "Server-to-Server OAuth"\n3. Give it a name (e.g. "Claw Voice")\n4. Copy Account ID, Client ID, and Client Secret\n5. Under Scopes, add: meeting:write:admin\n6. Activate the app',
                );
              }}
            >
              <Text style={styles.redirectUriBtnText}>How to set up Zoom app</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.zoomSignInBtn, (!settings.zoomAccountId || !settings.zoomClientId || !settings.zoomClientSecret) && styles.saveBtnDisabled]}
              onPress={async () => {
                if (!settings.zoomAccountId || !settings.zoomClientId || !settings.zoomClientSecret) {
                  Alert.alert('Missing Credentials', 'Enter your Zoom Account ID, Client ID, and Client Secret.');
                  return;
                }
                try {
                  const tokens = await getServerToServerToken(
                    settings.zoomAccountId,
                    settings.zoomClientId,
                    settings.zoomClientSecret,
                  );
                  const email = await getZoomUserEmail(tokens.accessToken);
                  const updatedSettings = {
                    ...settings,
                    zoomAccessToken: tokens.accessToken,
                    zoomRefreshToken: '',
                    zoomTokenExpiry: tokens.expiresAt,
                    zoomUserEmail: email || settings.userEmail || 'Connected',
                  };
                  setSettings(updatedSettings);
                  setSaved(false);
                  // Auto-save so Voice screen picks up the tokens immediately
                  await saveSettings(updatedSettings);
                  Alert.alert('Success', `Connected to Zoom${email ? ` as ${email}` : ''}!`);
                } catch (e: unknown) {
                  const msg = e instanceof Error ? e.message : 'Unknown error';
                  Alert.alert('Zoom Connection Failed', `Check your Account ID, Client ID, and Client Secret.\n\n${msg}`);
                }
              }}
              disabled={!settings.zoomAccountId || !settings.zoomClientId || !settings.zoomClientSecret}
            >
              <Text style={styles.saveBtnText}>Connect Zoom</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── What Claw Can Do ── */}
        <Section
          title="Services"
          subtitle="Connect services so Claw can use them for you."
        />
        {BUILT_IN_SERVICES.map((svc) => (
          <BuiltInServiceRow key={svc.id} name={svc.name} description={svc.desc} />
        ))}
        {CONNECTABLE_SERVICES.map((svc) => (
          <ConnectableServiceRow
            key={svc.id}
            service={svc}
            connected={!!settings.connectedServices?.[svc.id]}
            onConnect={() => handleConnect(svc)}
            onDisconnect={() => handleDisconnect(svc.id)}
          />
        ))}

        {/* ── OpenClaw Gateway ── */}
        <Section title="OpenClaw Gateway" />
        <Field
          label="Gateway URL"
          value={settings.gatewayUrl}
          onChangeText={(v) => update('gatewayUrl', v)}
          placeholder="ws://192.168.x.x:18789"
          keyboardType="url"
        />
        <Field
          label="Auth Token"
          value={settings.authToken}
          onChangeText={(v) => update('authToken', v)}
          placeholder="from openclaw.json"
          secureTextEntry
        />
        <Field
          label="Session Key"
          value={settings.sessionKey}
          onChangeText={(v) => update('sessionKey', v)}
          placeholder="main"
        />

        {/* ── TTS ── */}
        <Section title="Voice (Text-to-Speech)" />
        <SegmentedControl
          label="Provider"
          options={[
            { key: 'openai', label: 'OpenAI' },
            { key: 'kokoro', label: 'Kokoro' },
            { key: 'google', label: 'Google' },
            { key: 'device', label: 'Device' },
          ]}
          value={settings.ttsProvider}
          onChange={(v) => update('ttsProvider', v as AppSettings['ttsProvider'])}
        />
        {settings.ttsProvider === 'openai' && (
          <>
            <SegmentedControl
              label="Voice"
              options={[
                { key: 'nova', label: 'Nova' },
                { key: 'alloy', label: 'Alloy' },
                { key: 'echo', label: 'Echo' },
                { key: 'shimmer', label: 'Shimmer' },
                { key: 'onyx', label: 'Onyx' },
              ]}
              value={settings.openaiTtsVoice || 'nova'}
              onChange={(v) => update('openaiTtsVoice', v)}
            />
            <View style={styles.field}>
              <Text style={styles.hintText}>Uses your OpenAI key from the STT section below</Text>
            </View>
          </>
        )}
        {settings.ttsProvider === 'kokoro' && (
          <>
            <Field
              label="Kokoro URL"
              value={settings.kokoroUrl}
              onChangeText={(v) => update('kokoroUrl', v)}
              placeholder="http://192.168.1.x:3000"
              keyboardType="url"
            />
            <Field
              label="Kokoro API Key"
              value={settings.kokoroApiKey}
              onChangeText={(v) => update('kokoroApiKey', v)}
              placeholder="your-secret-key"
              secureTextEntry
            />
            <Field
              label="Voice"
              value={settings.kokoroVoice}
              onChangeText={(v) => update('kokoroVoice', v)}
              placeholder="af_heart"
              hint="Voices: af_heart · am_adam · af_nova · bm_george"
            />
          </>
        )}
        {settings.ttsProvider === 'google' && (
          <Field
            label="Google TTS API Key"
            value={settings.googleTtsApiKey}
            onChangeText={(v) => update('googleTtsApiKey', v)}
            placeholder="AIza..."
            secureTextEntry
          />
        )}

        {/* ── STT ── */}
        <Section title="Transcription (Speech-to-Text)" />
        <SegmentedControl
          label="Provider"
          options={[
            { key: 'whisper', label: 'Whisper' },
            { key: 'google', label: 'Google' },
            { key: 'device', label: 'Device' },
          ]}
          value={settings.sttProvider}
          onChange={(v) => update('sttProvider', v as AppSettings['sttProvider'])}
        />
        {settings.sttProvider === 'whisper' && (
          <Field
            label="OpenAI API Key"
            value={settings.whisperApiKey}
            onChangeText={(v) => update('whisperApiKey', v)}
            placeholder="sk-..."
            secureTextEntry
            hint="Also used for OpenAI TTS and GPT-4o via OpenClaw"
          />
        )}

        {/* ── Wake Word ── */}
        <Section title="Wake Word" />
        <Field
          label="Wake Phrases (comma separated)"
          value={settings.wakePhrases.join(', ')}
          onChangeText={(v) =>
            update(
              'wakePhrases',
              v.split(',').map((p) => p.trim().toLowerCase()).filter(Boolean)
            )
          }
          placeholder="hey claw, ok claw"
        />

        {/* ── Save ── */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>{saved ? 'Saved' : 'Save Settings'}</Text>
          )}
        </TouchableOpacity>

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  title: { fontFamily: 'Syne_700Bold', fontSize: 28, color: Colors.text },
  resetBtn: { fontFamily: 'Syne_500Medium', fontSize: 14, color: Colors.pink },
  scroll: { padding: 20 },
  sectionHeader: { marginTop: 28, marginBottom: 12 },
  sectionTitle: {
    fontFamily: 'Syne_700Bold',
    fontSize: 13,
    color: Colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionSubtitle: {
    fontFamily: 'Syne_400Regular',
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  field: { marginBottom: 14 },
  fieldLabel: {
    fontFamily: 'Syne_500Medium',
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Syne_400Regular',
    fontSize: 15,
    color: Colors.text,
  },
  hintText: {
    fontFamily: 'Syne_400Regular',
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    overflow: 'hidden',
  },
  segment: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  segmentActive: { backgroundColor: Colors.accentDim },
  segmentText: { fontFamily: 'Syne_500Medium', fontSize: 12, color: Colors.textSecondary },
  segmentTextActive: { color: Colors.accent },
  // Services
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  serviceDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12, flexShrink: 0 },
  serviceDotReady: { backgroundColor: '#4ade80' },
  serviceDotSetup: { backgroundColor: Colors.accent },
  serviceDotOff: { backgroundColor: Colors.textTertiary },
  serviceText: { flex: 1 },
  serviceName: { fontFamily: 'Syne_600SemiBold', fontSize: 14, color: Colors.text },
  serviceDesc: { fontFamily: 'Syne_400Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  serviceReadyLabel: { fontFamily: 'Syne_500Medium', fontSize: 12, color: '#4ade80' },
  connectBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
  },
  connectBtnText: { fontFamily: 'Syne_600SemiBold', fontSize: 12, color: '#fff' },
  disconnectBtn: {
    borderWidth: 1,
    borderColor: '#4ade80',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 8,
  },
  disconnectBtnText: { fontFamily: 'Syne_500Medium', fontSize: 11, color: '#4ade80' },
  saveBtn: {
    marginTop: 32,
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  redirectUriBtn: {
    marginTop: 4,
    marginBottom: 4,
    paddingVertical: 8,
    alignItems: 'center' as const,
  },
  redirectUriBtnText: {
    fontFamily: 'Syne_500Medium',
    fontSize: 12,
    color: Colors.accent,
    textDecorationLine: 'underline' as const,
  },
  msSignInBtn: {
    marginTop: 8,
    backgroundColor: '#0078D4',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  zoomSignInBtn: {
    marginTop: 8,
    backgroundColor: '#2D8CFF',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  saveBtnText: { fontFamily: 'Syne_700Bold', fontSize: 16, color: '#fff' },
  bottomPad: { height: 40 },
});

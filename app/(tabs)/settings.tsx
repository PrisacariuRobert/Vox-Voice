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
import { AppSettings } from '../../types';
import { openClawClient } from '../../lib/openclaw-client';
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
  userEmailApp: 'gmail',
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
};

export function buildProfileContext(settings: AppSettings): string {
  if (!settings.userName) return '';
  const connected = Object.entries(settings.connectedServices ?? {})
    .filter(([, v]) => v)
    .map(([k]) => k)
    .join(', ');
  const lines = [
    `Name: ${settings.userName}`,
    settings.userEmail ? `Email: ${settings.userEmail}` : null,
    `Timezone: ${settings.userTimezone}`,
    `Preferred calendar: ${settings.userCalendar === 'apple' ? 'Apple Calendar' : settings.userCalendar === 'google' ? 'Google Calendar' : 'Outlook Calendar'}`,
    `Preferred email: ${settings.userEmailApp === 'gmail' ? 'Gmail' : settings.userEmailApp === 'apple' ? 'Apple Mail' : 'Outlook'}`,
    connected ? `Connected services (logged in on Mac): ${connected}` : null,
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
  { id: 'google',   name: 'Google',           desc: 'Gmail + Google Calendar',   icon: '🔵', macCmd: 'open https://accounts.google.com' },
  { id: 'zoom',     name: 'Zoom',             desc: 'Schedule & join meetings',   icon: '🟦', macCmd: 'open -a "Zoom" || open https://zoom.us/signin' },
  { id: 'teams',    name: 'Microsoft Teams',  desc: 'Messages & meetings',        icon: '🟪', macCmd: 'open -a "Microsoft Teams" || open https://login.microsoftonline.com' },
  { id: 'youtube',  name: 'YouTube',          desc: 'Watch & search videos',      icon: '🔴', macCmd: 'open https://youtube.com' },
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
      <View style={[styles.serviceDot, connected ? styles.serviceDotReady : styles.serviceDotOff]} />
      <View style={styles.serviceText}>
        <Text style={styles.serviceName}>{service.icon} {service.name}</Text>
        <Text style={styles.serviceDesc}>{service.desc}</Text>
      </View>
      {connected ? (
        <TouchableOpacity onPress={onDisconnect} style={styles.disconnectBtn}>
          <Text style={styles.disconnectBtnText}>✓ Connected</Text>
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
            <Text style={styles.saveBtnText}>{saved ? '✓ Saved' : 'Save Settings'}</Text>
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
  saveBtnText: { fontFamily: 'Syne_700Bold', fontSize: 16, color: '#fff' },
  bottomPad: { height: 40 },
});

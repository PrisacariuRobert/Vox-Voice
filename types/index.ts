// Orb states
export type OrbState =
  | 'idle'
  | 'wake_listening'
  | 'recording'
  | 'thinking'
  | 'speaking'
  | 'done';

// App settings
export interface AppSettings {
  gatewayUrl: string;
  authToken: string;
  sessionKey: string;
  userName: string;
  userEmail: string;
  userTimezone: string;
  userCalendar: string;
  userEmailApp: string;
  useGpsLocation: boolean;
  wakePhrases: string[];
  ttsProvider: 'openai' | 'kokoro' | 'google' | 'device';
  openaiTtsVoice: string;
  kokoroUrl: string;
  kokoroApiKey: string;
  kokoroVoice: string;
  googleTtsApiKey: string;
  whisperApiKey: string;
  sttProvider: 'whisper' | 'google' | 'device';
  connectedServices: Record<string, boolean>;
  // Microsoft Graph
  microsoftClientId: string;
  microsoftAccessToken: string;
  microsoftRefreshToken: string;
  microsoftTokenExpiry: number;
  microsoftUserEmail: string;
  // Zoom (Server-to-Server OAuth)
  zoomAccountId: string;
  zoomClientId: string;
  zoomClientSecret: string;
  zoomAccessToken: string;
  zoomRefreshToken: string;
  zoomTokenExpiry: number;
  zoomUserEmail: string;
}

// ─── Action system ────────────────────────────────────────────────────────────

export type ActionType = 'send_email' | 'create_event' | 'create_meeting' | 'delete_event' | 'update_event' | 'set_alarm' | 'cancel_alarm';

export interface ActionPayload {
  actionType: ActionType;
  // Email fields
  to?: string;
  cc?: string;
  subject?: string;
  body?: string;
  // Calendar / meeting fields
  title?: string;
  startTime?: string;  // ISO 8601
  endTime?: string;    // ISO 8601
  location?: string;
  attendees?: string[];
  // Meeting specific
  meetingSubject?: string;
  meetingStartTime?: string;
  meetingEndTime?: string;
  sendTo?: string; // Email address to send meeting link to after creation
  // Delete/modify event
  eventId?: string;
  searchTitle?: string; // For finding events to delete/modify
  // Alarm
  alarmTime?: string; // HH:MM in 24h format (e.g. "07:00", "15:30")
  alarmLabel?: string;
}

export interface ClarificationField {
  key: keyof ActionPayload;
  label: string;
  placeholder: string;
  required: boolean;
  value?: string;
}

export type ActionStatus = 'pending' | 'executing' | 'success' | 'error';

// OpenClaw message
export interface OpenClawMessage {
  type: 'chunk' | 'done' | 'error' | 'connected';
  content?: string;
  session?: string;
  metadata?: Record<string, unknown>;
}

// Card data types
export type CardType =
  | 'calendar_added'
  | 'calendar_events'
  | 'weather'
  | 'email_sent'
  | 'email_read'
  | 'message_sent'
  | 'timer'
  | 'reminder'
  | 'map'
  | 'music'
  | 'now_playing'
  | 'photos'
  | 'notes'
  | 'contact'
  | 'briefing'
  | 'news'
  | 'stocks'
  | 'home'
  | 'alarm'
  | 'system_control'
  | 'navigation'
  | 'sports'
  | 'places'
  | 'flight'
  | 'package'
  | 'document'
  | 'routine'
  | 'health'
  | 'generic';

export interface PhotoQuery {
  from?: number;
  to?: number;
  limit?: number;
  personName?: string;
  searchType?: 'location' | 'name' | 'latest';
}

export interface CalendarEvent {
  title: string;
  time?: string;
  calendar?: string;
}

export interface NowPlayingData {
  title?: string;
  artist?: string;
  album?: string;
  isPlaying?: boolean;
  source?: string; // 'Spotify' | 'Apple Music' | 'Podcasts'
}

export interface ContactData {
  name?: string;
  email?: string;
  phone?: string;
  initials?: string;
}

export interface BriefingData {
  weather?: string;
  eventCount?: number;
  emailCount?: number;
}

export interface StockQuote {
  symbol: string;
  price?: string;
  change?: string;
  isUp?: boolean;
}

export interface CardData {
  type: CardType;
  content: string;
  metadata?: Record<string, unknown>;
}

// Conversation message
export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  card?: CardData;
}

// ─── New feature data types ───────────────────────────────────────────────────

export interface NavigationData {
  destination?: string;
  eta?: string;
  distance?: string;
}

export interface SportsData {
  type?: 'score' | 'standings' | 'f1' | 'schedule';
  league?: string;
  team?: string;
}

export interface PlaceData {
  query?: string;
  count?: number;
}

export interface FlightData {
  number?: string;
  status?: string;
  from?: string;
  to?: string;
  departure?: string;
  arrival?: string;
  gate?: string;
}

export interface PackageData {
  carrier?: string;
  status?: string;
  eta?: string;
  tracking?: string;
}

export interface DocumentData {
  action?: 'summary' | 'search';
  name?: string;
  query?: string;
  count?: number;
}

export interface RoutineStep {
  label: string;
  command: string;
  done?: boolean;
}

export interface HealthMetric {
  type: 'steps' | 'heart_rate' | 'sleep' | 'calories' | 'distance' | 'workouts';
  value?: string;
  unit?: string;
  goal?: string;
}

// Connection status
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

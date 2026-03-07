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
}

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
  | 'generic';

export interface PhotoQuery {
  from?: number;
  to?: number;
  limit?: number;
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

// Connection status
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export const DEFAULT_GATEWAY_URL = 'ws://192.168.0.119:18789';
export const DEFAULT_AUTH_TOKEN = '9d47f2f56f85e2ccf55c8c30048e62bbeefebb6840361106';
export const DEFAULT_KOKORO_URL = 'http://localhost:3000';
export const DEFAULT_KOKORO_VOICE = 'af_heart';
export const DEFAULT_SESSION_KEY = 'main';
export const DEFAULT_WAKE_PHRASES = ['hey claw', 'ok claw', 'hey openclaw'];

export const SILENCE_THRESHOLD_DB = -40;
export const SILENCE_DURATION_MS = 1500;
export const AUDIO_LEVEL_POLL_MS = 100;

export const WS_RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000];

export const WHISPER_API_URL = 'https://api.openai.com/v1/audio/transcriptions';

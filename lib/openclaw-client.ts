/**
 * OpenClaw WebSocket Client — Singleton client for the OpenClaw AI gateway.
 *
 * Features:
 *   - Protocol v3 with Ed25519 device authentication (nonce signing)
 *   - Pre-generated device keypair (no runtime keygen needed)
 *   - Message queueing: messages are buffered until handshake completes
 *   - Profile context injection: user profile is prepended to first message per session
 *   - Session-based routing: messages routed to agent:main:SESSION_KEY
 *   - Streaming response: chunks emitted as they arrive, 'done' signal on completion
 *   - Thinking timeout: forces 'done' after 60s if gateway goes silent
 *   - Auto-reconnect with exponential backoff (1s → 2s → 4s → 8s → 15s)
 *
 * Usage:
 *   openClawClient.connect(wsUrl, authToken)
 *   openClawClient.send("What's the weather?", "main")
 *   openClawClient.onMessage((msg) => { ... })  // chunk | done | error
 *   openClawClient.onStatus((status) => { ... }) // connecting | connected | disconnected | error
 *
 * The gateway (https://github.com/openclaw/openclaw) runs on the user's Mac
 * and executes commands via osascript, curl, and shell — then streams AI
 * responses back to the phone over WebSocket.
 *
 * @module openclaw-client
 */
import { ed25519 } from '@noble/curves/ed25519.js';
import { OpenClawMessage, ConnectionStatus } from '../types';

type MessageCallback = (msg: OpenClawMessage) => void;
type StatusCallback = (status: ConnectionStatus) => void;

const PROTOCOL_VERSION = 3;

// ── Mobile Device Identity ────────────────────────────────────────────────────
// Pre-generated Ed25519 keypair for this mobile app.
// deviceId = SHA-256 of raw public key bytes (derived deterministically).
const DEVICE_ID = '7fe19cf35c1344252874c1ac8ee4023eab6a64c5d0483d2f79dc4668f78c2b9d';
const DEVICE_PUBLIC_KEY_B64URL = 'xVTxEqLEWNvvMQJ8BS3zvNMWQ2vKVLEZpEELuDlsovw';
const DEVICE_PRIVATE_SEED_HEX = '6a641f94c0ee9d80b955b3d06a20323ec013e14e16c1451b6791209cd21e8a7e';

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function buildDevicePayloadV3(params: {
  deviceId: string;
  clientId: string;
  clientMode: string;
  role: string;
  scopes: string[];
  signedAtMs: number;
  token: string;
  nonce: string;
  platform: string;
}): string {
  return [
    'v3',
    params.deviceId,
    params.clientId,
    params.clientMode,
    params.role,
    params.scopes.join(','),
    String(params.signedAtMs),
    params.token,
    params.nonce,
    params.platform.toLowerCase().trim(),
    '', // deviceFamily — not set for iOS app
  ].join('|');
}

// ─────────────────────────────────────────────────────────────────────────────

export class OpenClawClient {
  private ws: WebSocket | null = null;
  private url = '';
  private token = '';
  private retryCount = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;
  private connected = false;
  private pendingQueue: Array<{ content: string; session: string }> = [];
  private requestCounter = 0;
  private profileContext = '';
  private profileSentSessions: Set<string> = new Set();
  private thinkingTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly THINKING_TIMEOUT_MS = 60_000;

  private messageListeners: MessageCallback[] = [];
  private statusListeners: StatusCallback[] = [];

  // ── Public API ────────────────────────────────────────────────────────────

  connect(url: string, token = '') {
    this.url = url;
    this.token = token;
    this.destroyed = false;
    this.connected = false;
    this.retryCount = 0;
    this.profileSentSessions.clear();
    this._openSocket();
  }

  setProfileContext(profile: string) {
    this.profileContext = profile;
    this.profileSentSessions.clear();
  }

  send(content: string, session = 'main') {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[OpenClaw] Cannot send — not connected');
      return;
    }
    if (!this.connected) {
      // Queue until handshake completes
      this.pendingQueue.push({ content, session });
      return;
    }
    this._sendAgentMessage(content, session);
  }

  disconnect() {
    this.destroyed = true;
    this.connected = false;
    this._clearRetryTimer();
    this._clearThinkingTimer();
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this._emitStatus('disconnected');
  }

  onMessage(cb: MessageCallback) {
    this.messageListeners.push(cb);
    return () => {
      this.messageListeners = this.messageListeners.filter((l) => l !== cb);
    };
  }

  onStatus(cb: StatusCallback) {
    this.statusListeners.push(cb);
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== cb);
    };
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private _openSocket() {
    if (this.destroyed) return;

    this._emitStatus('connecting');

    const wsUrl = this.token
      ? `${this.url}?token=${encodeURIComponent(this.token)}`
      : this.url;

    try {
      const ws = new WebSocket(wsUrl);
      this.ws = ws;

      ws.onopen = () => {
        this.retryCount = 0;
        // Don't emit 'connected' yet — wait for handshake
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string);
          this._handleServerMessage(msg);
        } catch {
          // ignore non-JSON frames
        }
      };

      ws.onerror = () => {
        this._emitStatus('error');
      };

      ws.onclose = () => {
        this.ws = null;
        this.connected = false;
        if (!this.destroyed) {
          this._scheduleRetry();
        }
      };
    } catch {
      this._emitStatus('error');
      if (!this.destroyed) this._scheduleRetry();
    }
  }

  private _handleServerMessage(msg: Record<string, unknown>) {
    const type = msg.type as string;
    const event = msg.event as string | undefined;

    // Step 1: Server sends connect.challenge — extract nonce and respond
    if (type === 'event' && event === 'connect.challenge') {
      const payload = msg.payload as Record<string, unknown> | undefined;
      const nonce = typeof payload?.nonce === 'string' ? payload.nonce.trim() : '';
      this._sendConnectHandshake(nonce);
      return;
    }

    // Step 2: connect response
    if (type === 'res' && (msg.id as string) === 'c0') {
      if (msg.ok) {
        this.connected = true;
        this._emitStatus('connected');
        this._emit({ type: 'connected' });
        // Flush any queued messages
        const queued = this.pendingQueue.splice(0);
        for (const { content, session } of queued) {
          this._sendAgentMessage(content, session);
        }
      } else {
        const err = msg.error as Record<string, unknown> | undefined;
        console.error('[OpenClaw] connect failed:', err?.message);
        this._emitStatus('error');
      }
      return;
    }

    // Step 3: Streaming agent events
    if (type === 'event' && event === 'agent') {
      const payload = msg.payload as Record<string, unknown> | undefined;
      const stream = payload?.stream as string | undefined;
      const data = payload?.data as Record<string, unknown> | undefined;

      if (stream === 'assistant' && data?.delta) {
        this._resetThinkingTimer();
        this._emit({ type: 'chunk', content: data.delta as string });
      } else if (stream === 'lifecycle' && (data?.phase as string) === 'end') {
        this._clearThinkingTimer();
        this._emit({ type: 'done' });
      }
      return;
    }

    // Agent call accepted/final response — nothing to do here
  }

  private _sendConnectHandshake(nonce: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const scopes = ['operator.admin', 'operator.write', 'operator.read'];
    const signedAtMs = Date.now();

    // Build the device auth payload string and sign with Ed25519
    const payloadStr = buildDevicePayloadV3({
      deviceId: DEVICE_ID,
      clientId: 'openclaw-ios',
      clientMode: 'node',
      role: 'operator',
      scopes,
      signedAtMs,
      token: this.token,
      nonce,
      platform: 'ios',
    });

    const seed = hexToBytes(DEVICE_PRIVATE_SEED_HEX);
    const msgBytes = new TextEncoder().encode(payloadStr);
    const sigBytes = ed25519.sign(msgBytes, seed);
    const signature = base64UrlEncode(sigBytes);

    const connectPayload = JSON.stringify({
      type: 'req',
      id: 'c0',
      method: 'connect',
      params: {
        auth: { token: this.token },
        minProtocol: PROTOCOL_VERSION,
        maxProtocol: PROTOCOL_VERSION,
        client: {
          id: 'openclaw-ios',
          mode: 'node',
          version: '1.0',
          platform: 'ios',
        },
        role: 'operator',
        scopes,
        device: {
          id: DEVICE_ID,
          publicKey: DEVICE_PUBLIC_KEY_B64URL,
          signature,
          signedAt: signedAtMs,
          nonce,
        },
      },
    });
    this.ws.send(connectPayload);
  }

  private _sendAgentMessage(content: string, session: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const reqId = `r${++this.requestCounter}`;
    const idempotencyKey = `mobile-${Date.now()}-${this.requestCounter}`;
    // Normalize session key: accept 'main' or full 'agent:main:main' format
    const sessionKey = session.startsWith('agent:') ? session : `agent:main:${session}`;
    const agentId = sessionKey.split(':')[1] ?? 'main';

    // Prepend profile context to first message of each session
    let message = content;
    if (this.profileContext && !this.profileSentSessions.has(sessionKey)) {
      this.profileSentSessions.add(sessionKey);
      message = `[USER PROFILE - use this to personalize all responses]\n${this.profileContext}\n[/USER PROFILE]\n\n${content}`;
    }

    const payload = JSON.stringify({
      type: 'req',
      id: reqId,
      method: 'agent',
      params: {
        message,
        agentId,
        idempotencyKey,
        sessionKey,
      },
    });
    this.ws.send(payload);
    this._resetThinkingTimer();
  }

  private _resetThinkingTimer() {
    this._clearThinkingTimer();
    this.thinkingTimer = setTimeout(() => {
      console.warn('[OpenClaw] Thinking timeout — forcing done');
      this._emit({ type: 'done' });
    }, this.THINKING_TIMEOUT_MS);
  }

  private _clearThinkingTimer() {
    if (this.thinkingTimer) {
      clearTimeout(this.thinkingTimer);
      this.thinkingTimer = null;
    }
  }

  private _scheduleRetry() {
    const delays = [1000, 2000, 4000, 8000, 15000];
    const delay = delays[Math.min(this.retryCount, delays.length - 1)];
    this.retryCount++;
    this._emitStatus('connecting');
    this.retryTimer = setTimeout(() => this._openSocket(), delay);
  }

  private _clearRetryTimer() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  private _emit(msg: OpenClawMessage) {
    this.messageListeners.forEach((cb) => cb(msg));
  }

  private _emitStatus(status: ConnectionStatus) {
    this.statusListeners.forEach((cb) => cb(status));
  }
}

// Singleton for app-wide use
export const openClawClient = new OpenClawClient();

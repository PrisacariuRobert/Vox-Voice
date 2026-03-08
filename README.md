# Vox

A voice-first AI assistant for iOS and Android, built with React Native and Expo. Vox connects to an [OpenClaw](https://github.com/nichochar/openclaw) gateway running on your Mac to execute commands, control apps, and answer questions — all by voice.

Think of it as your personal Siri replacement that actually works: it can send emails, create calendar events, schedule Zoom meetings, play music, control your smart home, look up stocks, track flights, and much more.

<p align="center">
  <img src="assets/screenshot-idle.png" width="280" alt="Vox idle screen" />
  <img src="assets/screenshot-card.png" width="280" alt="Vox action card" />
</p>

## How It Works

```
┌──────────┐     Whisper STT      ┌────────────────┐     WebSocket      ┌──────────────┐
│          │  ───────────────────> │                │  ────────────────> │              │
│  Phone   │     voice audio      │   Vox App      │     user text     │   OpenClaw   │
│  (mic)   │                      │   (React       │                    │   Gateway    │
│          │  <─────────────────  │    Native)     │  <────────────────  │   (Mac)      │
│          │     TTS audio        │                │     AI response    │              │
└──────────┘                      └────────────────┘                    └──────────────┘
                                         │
                                         ├── Parse response → Action Cards (25 types)
                                         ├── Execute actions → Calendar, Zoom, Email
                                         └── Speak response → OpenAI / Kokoro / Google TTS
```

1. **You speak** — Vox records audio and sends it to OpenAI Whisper for transcription
2. **Smart prompt expansion** — Your words are expanded into detailed prompts (e.g., "play Drake" becomes a full Apple Music automation sequence)
3. **OpenClaw processes** — The gateway runs commands on your Mac (osascript, curl, shortcuts) and streams the AI response back
4. **Rich UI cards** — Responses are parsed into 25+ interactive card types (weather, calendar, maps, stocks, etc.)
5. **Voice response** — The answer is spoken back to you via TTS
6. **Interrupt anytime** — Tap the orb during a response to stop and ask something new

## Features

### Voice Commands
| Category | Examples |
|----------|---------|
| **Calendar** | "What's on my schedule today?", "Add meeting with John tomorrow at 3pm" |
| **Email** | "Send an email to Sarah about the project update", "Check my inbox" |
| **Meetings** | "Schedule a Zoom meeting for Friday at 2pm" |
| **Music** | "Play Starboy by The Weeknd", "Next track", "Pause" |
| **Weather** | "What's the weather?", "Will it rain tomorrow?" |
| **Navigation** | "Navigate to Amsterdam Central", "Find nearest coffee shop" |
| **Smart Home** | "Turn off the lights", "Set thermostat to 21 degrees" |
| **Alarms** | "Set an alarm for 7am", "Cancel alarm" |
| **Notes** | "Create a note about the meeting summary" |
| **Reminders** | "Remind me to call the dentist" |
| **Phone** | "Call Mom", "Call +31612345678" |
| **Briefing** | "Good morning" (gets calendar, emails, weather in one go) |
| **Stocks** | "How's Tesla doing?", "AAPL stock price" |
| **News** | "What's the latest news?" |
| **F1** | "F1 standings", "Next F1 race", "Last race results" |
| **Sports** | "Who won the match?", "Live scores" |
| **Flights** | "Track flight KL1009" |
| **Packages** | "Where's my package?" |
| **Documents** | "Find documents about taxes", "Summarize this PDF" |
| **Photos** | "Show photos from January", "Find photos with a sunset" |
| **Routines** | "I'm leaving home", "Bedtime", "Good night" |
| **Health** | "How many steps today?", "My sleep data" |

### Action Cards (25 types)
Every response is parsed into a rich, interactive card:

- **CalendarCard** — Shows events with edit/delete actions
- **WeatherCard** — Temperature, conditions, forecast
- **NowPlayingCard** — Album art, controls, AirPlay
- **PlacesCard** — Nearby locations with tap-to-navigate
- **NavigationCard** — Directions with Apple Maps integration
- **EmailCard** — Sent confirmation with recipient and subject
- **MapsCard** — Interactive map preview
- **StocksCard** — Price, change, chart
- **NewsCard** — Headlines with sources
- **TimerCard** — Live countdown with pause/cancel
- **AlarmCard** — Alarm set confirmation
- **HealthCard** — Steps, heart rate, sleep, calories
- **FlightCard** — Flight status and tracking
- **PackageCard** — Delivery status
- **DocumentCard** — File list with tap-to-open
- **PhotosCard** — Photo grid with AI vision search
- **RoutineCard** — Step-by-step checklist
- **BriefingCard** — Morning briefing summary
- **SportsCard** — Live scores and standings
- **HomeCard** — Smart home device status
- **NotesCard** — Note creation confirmation
- And more...

## Prerequisites

- **Node.js** 18+ and npm
- **Expo CLI** (`npm install -g expo-cli`)
- **OpenClaw Gateway** running on your Mac ([setup guide](https://github.com/nichochar/openclaw))
- **OpenAI API key** (for Whisper STT and optionally TTS)
- **iOS device** or **Android device** (physical device recommended for mic/audio)
- **Xcode** (for iOS builds) or **Android Studio** (for Android builds)

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/PrisacariuRobert/Vox-Voice
cd vox
npm install
```

### 2. Start the OpenClaw gateway on your Mac

Follow the [OpenClaw setup guide](https://github.com/nichochar/openclaw) to get the gateway running. Note the WebSocket URL (default: `ws://YOUR_MAC_IP:18789`) and auth token from `openclaw.json`.

### 3. Run the app

```bash
# Development build (recommended — supports all native modules)
npx expo run:ios
# or
npx expo run:android

# Web preview (limited — no mic, no native APIs)
npx expo start --web
```

### 4. Configure in Settings

Open the app and go to Settings (gear icon, top-right):

1. **Your Profile** — Enter your name, email, and timezone
2. **OpenClaw Gateway** — Enter the WebSocket URL and auth token
3. **Transcription** — Add your OpenAI API key (used for Whisper STT)
4. **Voice** — Pick a TTS provider (OpenAI, Kokoro, Google, or device)

The green dot next to "Vox" in the header means you're connected to the gateway.

## Configuration

### OpenClaw Gateway
| Setting | Description | Default |
|---------|-------------|---------|
| Gateway URL | WebSocket URL of your OpenClaw gateway | `ws://192.168.0.119:18789` |
| Auth Token | Auth token from `openclaw.json` | — |
| Session Key | Session identifier | `main` |

### Speech-to-Text (STT)
| Provider | Setup |
|----------|-------|
| **Whisper** (recommended) | Add your OpenAI API key in Settings |
| Google | Add Google Cloud Speech API key |
| Device | Uses built-in iOS/Android speech recognition (offline) |

### Text-to-Speech (TTS)
| Provider | Setup |
|----------|-------|
| **OpenAI** (recommended) | Uses the same OpenAI API key. Voices: Nova, Alloy, Echo, Shimmer, Onyx |
| Kokoro | Self-hosted OpenAI-compatible TTS. Enter URL and API key |
| Google | Google Cloud TTS API key |
| Device | Built-in iOS/Android speech synthesis (offline, free) |

### Integrations

#### Microsoft (Outlook + Calendar)
1. Create an app in [Azure Portal](https://portal.azure.com) → App Registrations
2. Add the redirect URI shown in Settings → "Show Redirect URI for Azure"
3. Enter the Client ID and sign in

#### Zoom (Meetings)
1. Go to [Zoom Marketplace](https://marketplace.zoom.us) → Build App → Server-to-Server OAuth
2. Add the scope `meeting:write:admin`
3. Enter Account ID, Client ID, and Client Secret in Settings

## Project Structure

```
claw-voice/
├── app/                        # Expo Router screens
│   ├── _layout.tsx             # Root layout (fonts, gesture handler)
│   └── (tabs)/
│       ├── _layout.tsx         # Tab configuration
│       ├── index.tsx           # Main voice screen
│       ├── history.tsx         # Conversation history
│       └── settings.tsx        # Settings + profile
├── components/
│   ├── VoiceOrb/               # Animated orb with SVG blobs
│   ├── ActionCards/            # 25+ response card components
│   │   ├── CardEngine.tsx      # Card type router
│   │   ├── CalendarCard.tsx
│   │   ├── WeatherCard.tsx
│   │   └── ...
│   ├── Icons.tsx               # SVG icon components
│   ├── StatusDot.tsx           # Connection status indicator
│   └── ClarificationDialog.tsx # Missing field prompt
├── hooks/
│   ├── useVoiceInput.ts        # Mic recording → Whisper STT
│   ├── useOpenClaw.ts          # WebSocket gateway communication
│   ├── useTTS.ts               # Text-to-speech (multi-provider)
│   └── useWakeWord.ts          # Wake word detection
├── lib/
│   ├── openclaw-client.ts      # WebSocket client (Ed25519 auth)
│   ├── card-parser.ts          # Response → card type detection
│   ├── action-executor.ts      # Execute calendar/meeting/alarm actions
│   ├── action-validator.ts     # Validate action payloads
│   ├── whisper-stt.ts          # OpenAI Whisper transcription
│   ├── openai-tts.ts           # OpenAI TTS
│   ├── kokoro-tts.ts           # Kokoro (self-hosted) TTS
│   ├── google-tts.ts           # Google Cloud TTS
│   ├── microsoft-auth.ts       # Microsoft OAuth2
│   ├── microsoft-graph.ts      # Outlook/Calendar API
│   ├── zoom-auth.ts            # Zoom Server-to-Server OAuth
│   ├── zoom-api.ts             # Zoom meeting creation
│   ├── location.ts             # GPS location
│   ├── conversation-store.ts   # Message persistence (AsyncStorage)
│   ├── audio-utils.ts          # Haptics and sound effects
│   └── vision-photo-search.ts  # AI-powered photo search
├── constants/
│   ├── colors.ts               # Design tokens (light theme)
│   └── config.ts               # URLs, thresholds, defaults
├── types/
│   └── index.ts                # TypeScript types and interfaces
├── app.json                    # Expo configuration
├── eas.json                    # EAS Build profiles
├── babel.config.js             # Babel + Reanimated plugin
├── tsconfig.json               # TypeScript config
└── package.json
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native 0.83 + Expo SDK 55 |
| Routing | Expo Router v5 (file-based) |
| Language | TypeScript (strict, zero errors) |
| Animations | React Native Reanimated 3 |
| Gestures | React Native Gesture Handler 2 |
| Bottom Sheets | @gorhom/bottom-sheet |
| SVG | react-native-svg |
| Storage | @react-native-async-storage |
| Crypto | @noble/curves (Ed25519) |
| Font | Syne (Google Fonts) |

## Voice Pipeline

```
         ┌─────────────┐
         │   Tap Orb    │
         └──────┬───────┘
                │
         ┌──────▼───────┐
         │  Recording    │  expo-audio (HIGH_QUALITY preset)
         │  + Metering   │  Silence detection: -40dB for 1.5s
         └──────┬───────┘
                │
         ┌──────▼───────┐
         │  Whisper STT  │  OpenAI API (verbose_json, language=en)
         └──────┬───────┘
                │
         ┌──────▼───────┐
         │  Prompt       │  50+ phrase patterns → detailed prompts
         │  Expansion    │  Conversation context prepended
         └──────┬───────┘
                │
         ┌──────▼───────┐
         │  OpenClaw     │  WebSocket with Ed25519 device auth
         │  Gateway      │  Streaming chunks → done signal
         └──────┬───────┘
                │
         ┌──────▼───────┐
         │  Card Parser  │  25+ card types detected from markers
         │  + Actions    │  [ACTION:] markers → API execution
         └──────┬───────┘
                │
        ┌───────┴────────┐
        │                │
 ┌──────▼──────┐  ┌──────▼──────┐
 │  UI Card     │  │  TTS        │  OpenAI / Kokoro / Google / Device
 │  Rendered    │  │  Speaking    │  stripMarkdown() before speaking
 └─────────────┘  └─────────────┘
```

## Orb States

The animated orb changes appearance based on the current state:

| State | Appearance | Trigger |
|-------|-----------|---------|
| `idle` | Slow gentle pulse | Default / after done |
| `wake_listening` | Cyan-purple with ripples | Wake word detected |
| `recording` | Fast blue pulse + audio-reactive scaling | Tap to record |
| `thinking` | Purple medium pulse | Processing request |
| `speaking` | Green fast pulse | TTS playing |
| `done` | Pink bounce | Response complete |

## Building for Device

### Development Build (recommended)

```bash
# iOS
npx expo run:ios --device

# Android
npx expo run:android --device
```

### Production Build with EAS

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure your account
eas login

# Build for iOS
eas build --platform ios --profile production

# Build for Android
eas build --platform android --profile production
```

### Build Profiles (eas.json)

| Profile | Description |
|---------|-------------|
| `development` | Dev client with debugging, internal distribution |
| `preview` | Release build for internal testing |
| `production` | App Store / Play Store release |

## Wake Word

Vox supports wake word detection using periodic Whisper bursts. Configure your wake phrases in Settings (default: "hey vox", "ok vox"). When a wake phrase is detected, Vox starts recording automatically.

> **Note:** For better wake word detection, you can integrate [Porcupine](https://picovoice.ai/porcupine/) — the architecture supports swapping in a dedicated wake word engine.

## Photo Search Server (YOLO + CLIP + OpenAI)

Vox includes an AI-powered photo search that lets you find photos by describing them ("find photos with an F1 car", "photos of sunsets", "picture of my dog"). It runs a two-stage pipeline on a companion Python server:

```
┌──────────────┐     thumbnails      ┌─────────────────────────────┐
│  Phone       │  ──────────────────>│  YOLO Server (Mac)          │
│  Photo       │     base64 batch    │  Port 18790                 │
│  Library     │                     │                             │
│              │  <──────────────────│  Stage 1: YOLO + CLIP       │
│              │     match indices   │    - Object detection       │
└──────────────┘                     │    - Semantic similarity    │
                                     │                             │
                                     │  Stage 2: OpenAI Vision     │
                                     │    - Verify candidates      │
                                     │    - Reject false positives │
                                     └─────────────────────────────┘
```

**Stage 1 — YOLO + CLIP (local, fast, free):**
- YOLO11 detects objects in each photo (car, person, dog, etc.)
- CLIP computes semantic similarity between the photo and your search query
- Scores are combined; candidates above threshold are selected

**Stage 2 — OpenAI Vision (accurate verification):**
- Candidate photos are sent to GPT-4.1-mini for strict verification
- False positives are filtered out (e.g., a toy car vs a real car)
- Only confirmed matches are returned to the app

**Fallback:** If the YOLO server is unavailable, the app falls back to OpenAI-only search directly from the phone (slower, uses more API credits, but still works).

### Setup

```bash
cd yolo-server

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

**requirements.txt:**
```
ultralytics
flask
pillow
torch
git+https://github.com/openai/CLIP.git
```

The YOLO model (`yolo11n.pt`) is downloaded automatically by ultralytics on first run.

### Configuration

Create a `.env` file in the `yolo-server/` directory:

```env
OPENAI_API_KEY=sk-your-openai-api-key-here
```

The OpenAI key is optional — without it, the server runs YOLO+CLIP only (no verification stage). Results will be less accurate but still useful.

### Running

```bash
cd yolo-server
source venv/bin/activate
python server.py
```

The server starts on port **18790** (one port above the OpenClaw gateway at 18789). The app auto-discovers it from your gateway URL.

```
🔍 YOLO Photo Search Server starting on port 18790
   YOLO:   ✅
   CLIP:   ✅
   OpenAI: ✅

   Test: curl http://localhost:18790/health
```

### API

**Health check:**
```bash
curl http://localhost:18790/health
# → {"status":"ok","yolo":true,"clip":true,"openai":true}
```

**Search:**
```bash
curl -X POST http://localhost:18790/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "sunset at the beach",
    "images": ["base64...", "base64..."],
    "threshold": 0.20,
    "top_k": 10,
    "verify": true
  }'
# → {"matches":[0,3],"candidates":[0,3,7],"details":[...],"verified":true}
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `query` | string | required | Natural language search query |
| `images` | string[] | required | Base64-encoded JPEG thumbnails |
| `threshold` | float | `0.20` | CLIP similarity threshold |
| `top_k` | int | `10` | Maximum results to return |
| `verify` | bool | `true` | Enable OpenAI verification stage |

### How It Connects

The app derives the YOLO server URL from your gateway URL automatically:
- Gateway: `ws://192.168.0.119:18789` → Photo server: `http://192.168.0.119:18790`
- No extra configuration needed in the app

When you say "find photos with a dog", the app:
1. Scans your photo library page by page (100 photos at a time)
2. Creates 256px thumbnails and sends them to the YOLO server
3. The server scores and verifies each batch
4. Confirmed matches stream to the UI in real-time as they're found

### Models Used

| Model | Purpose | Size | Device |
|-------|---------|------|--------|
| YOLO11n | Object detection | ~6MB | CPU/MPS |
| CLIP ViT-B/32 | Semantic similarity | ~350MB | CPU/MPS (Apple Silicon) |
| GPT-4.1-mini | Visual verification | Cloud | OpenAI API |

On Apple Silicon Macs, CLIP runs on the MPS (Metal) backend for faster inference.

## Contributing

Contributions are welcome! Here's how to get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run type checking: `npx tsc --noEmit`
5. Commit: `git commit -m "Add my feature"`
6. Push: `git push origin feature/my-feature`
7. Open a Pull Request

### Adding a New Action Card

1. Create `components/ActionCards/YourCard.tsx`
2. Add the card type to `CardType` in `types/index.ts`
3. Add detection logic in `lib/card-parser.ts`
4. Register it in `components/ActionCards/CardEngine.tsx`
5. Add a prompt expansion in `app/(tabs)/index.tsx` → `expandSpecialPhrase()`

### Adding a New Voice Command

1. Add a regex pattern in `expandSpecialPhrase()` in `app/(tabs)/index.tsx`
2. Write the prompt expansion that tells the AI what to do
3. Add end markers (e.g., `[WEATHER: ...]`) so the card parser can detect the response type
4. Add card detection in `lib/card-parser.ts` if needed

## Troubleshooting

**"Microphone permission denied"**
> Go to your device Settings → Vox → allow Microphone access.

**Gateway not connecting (red dot)**
> Make sure OpenClaw is running on your Mac and the phone is on the same Wi-Fi network. Check the gateway URL in Settings.

**Whisper not transcribing**
> Verify your OpenAI API key in Settings. Check that it has credits available.

**No sound from TTS**
> Check your device volume. Try switching TTS provider to "Device" in Settings to test with built-in speech.

**Cards not showing (generic response)**
> The AI response may not include the expected markers. Check the gateway logs to see the full response.

## License

MIT

## Acknowledgments

- [OpenClaw](https://github.com/nichochar/openclaw) — The AI gateway that powers Vox
- [Expo](https://expo.dev) — React Native framework
- [OpenAI](https://openai.com) — Whisper STT and TTS
- [Syne](https://fonts.google.com/specimen/Syne) — Typography

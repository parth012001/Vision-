# Barista Vision - Codebase Overview


---

## What Is This App?

**Barista Vision** is a real-time AI barista coach. You point your phone camera at coffee equipment (grinder, espresso machine), and the AI sees what you see and talks you through making coffee — all via voice.

Think of it as a video call with an expert barista who can see your equipment and guide you step-by-step.

### The Core Experience
1. User opens app on phone
2. Taps "Start Session"
3. Points rear camera at their coffee equipment
4. AI sees the video feed and speaks instructions
5. User talks back, asks questions
6. AI responds in real-time voice

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (React 19, TypeScript) |
| Real-time AI | Google Gemini Live API (WebSocket) |
| Audio | Web Audio API + AudioWorklet |
| Video | Canvas API for frame capture |
| Styling | Tailwind CSS |
| Testing | Vitest |

---

## How Data Flows Through the App

Here's the big picture of what happens when someone uses the app:

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER'S PHONE                            │
│                                                                 │
│   ┌──────────────┐              ┌──────────────┐               │
│   │ Rear Camera  │              │  Microphone  │               │
│   │   (1 fps)    │              │  (16kHz PCM) │               │
│   └──────┬───────┘              └──────┬───────┘               │
│          │                             │                        │
│          │ JPEG frames                 │ Audio chunks           │
│          │ (base64)                    │ (base64)               │
│          │                             │                        │
│          └──────────────┬──────────────┘                        │
│                         │                                       │
│                         ▼                                       │
│          ┌──────────────────────────────┐                       │
│          │      useLiveSession          │                       │
│          │   (the main orchestrator)    │                       │
│          └──────────────┬───────────────┘                       │
│                         │                                       │
│                         │ WebSocket                             │
│                         ▼                                       │
└─────────────────────────┼───────────────────────────────────────┘
                          │
                          │ Bidirectional streaming
                          │ (audio + video up, audio + text down)
                          │
┌─────────────────────────┼───────────────────────────────────────┐
│                         ▼                                       │
│          ┌──────────────────────────────┐                       │
│          │    Gemini Live API           │                       │
│          │  (Google's real-time AI)     │                       │
│          └──────────────────────────────┘                       │
│                                                                 │
│                    GOOGLE CLOUD                                 │
└─────────────────────────────────────────────────────────────────┘
                          │
                          │ AI speaks back
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                         USER'S PHONE                            │
│                                                                 │
│          ┌──────────────────────────────┐                       │
│          │      useLiveSession          │                       │
│          └──────────────┬───────────────┘                       │
│                         │                                       │
│          ┌──────────────┴──────────────┐                        │
│          │                             │                        │
│          ▼                             ▼                        │
│   ┌─────────────┐              ┌──────────────┐                │
│   │  Speaker    │              │  Transcript  │                │
│   │ (AI voice)  │              │   (UI text)  │                │
│   └─────────────┘              └──────────────┘                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key insight**: The browser connects directly to Google's WebSocket. There's no backend relay — just a simple `/api/token` endpoint that hands out API keys securely.

---

## Folder Structure

```
src/
├── app/                    # Next.js pages and API routes
│   ├── page.tsx           # Home page (Start button)
│   ├── session/page.tsx   # The actual camera/voice session
│   └── api/
│       ├── token/         # Gives browser a secure API token
│       └── analyze/       # "Snap & Analyze" image analysis
│
├── components/             # React UI components (visual only)
│   ├── SessionView.tsx    # Main session screen
│   ├── CameraView.tsx     # Shows the camera feed
│   ├── ControlTray.tsx    # Buttons at bottom (mic, camera, snap, end)
│   ├── TranscriptOverlay.tsx   # Shows what AI/user said
│   └── StatusIndicator.tsx     # "Connected", "Speaking", etc.
│
├── hooks/                  # React hooks (all the logic lives here)
│   ├── useLiveSession.ts  # THE BIG ONE - orchestrates everything
│   ├── useAudioCapture.ts # Captures microphone audio
│   ├── useCameraCapture.ts# Captures camera frames
│   ├── useAudioPlayback.ts# Plays AI voice through speaker
│   └── useSnapAnalyze.ts  # High-res photo analysis feature
│
├── lib/                    # Utility code
│   ├── gemini-live-client.ts  # WebSocket wrapper for Gemini
│   ├── audio-streamer.ts      # Gapless audio playback
│   ├── constants.ts           # Config values (sample rates, etc.)
│   └── audio-utils.ts         # Convert between audio formats
│
├── knowledge/              # What the AI knows about coffee equipment
│   ├── system-prompt.ts   # Assembles all knowledge into one prompt
│   ├── eg1-manual.ts      # Weber EG-1 grinder specs
│   ├── eg1-workflow.ts    # Step-by-step grinding procedures
│   └── gs3-machine.ts     # La Marzocco GS3 espresso machine
│
└── types/                  # TypeScript type definitions
    └── session.ts         # SessionStatus, AIState, etc.
```

---

## The Most Important Files (Read These First)

### 1. `hooks/useLiveSession.ts` — The Brain

This is the most complex file. It coordinates everything:

- Connects/disconnects from Gemini
- Handles reconnection if connection drops
- Routes microphone audio → Gemini
- Routes camera frames → Gemini
- Routes AI audio → speaker
- Tracks conversation transcript
- Manages session state (connecting, connected, error, etc.)

**If you only read one file, read this one.**

### 2. `lib/gemini-live-client.ts` — The WebSocket Wrapper

Wraps Google's SDK to make it easier to use:

```typescript
// What it provides:
client.connect()           // Start WebSocket connection
client.disconnect()        // Close cleanly
client.sendAudio(base64)   // Send mic audio
client.sendVideo(base64)   // Send camera frame
```

### 3. `knowledge/system-prompt.ts` — The AI's Personality

This defines who the AI is and what it knows:
- Role: "You are Vision, an expert barista coach..."
- Equipment knowledge: EG-1 grinder, GS3 espresso machine
- Rules: "One step at a time", "Keep responses short", etc.

### 4. `components/SessionView.tsx` — The Main Screen

The primary UI component. It receives all the state from `useLiveSession` and renders:
- Camera preview
- Control buttons
- Transcript overlay
- Status indicator

---

## Key Concepts to Understand

### 1. Everything is Base64 Strings

Audio and video data flows through the app as **base64-encoded strings**, not browser Blobs or ArrayBuffers.

```typescript
// Audio from mic
"SGVsbG8gV29ybGQ="  // base64 PCM data

// Video from camera
"/9j/4AAQSkZJRg..."  // base64 JPEG data
```

Why? The Gemini SDK expects this format: `{ data: base64string, mimeType: "audio/pcm" }`.

### 2. The "Generation Counter" Pattern

The codebase uses generation counters to prevent **race conditions**. Here's the problem:

```
1. User clicks "Connect"
2. Connection starts...
3. User clicks "Disconnect" (changes their mind)
4. User clicks "Connect" again
5. First connection finally opens — but it's stale!
```

The solution:

```typescript
const generation = ++this.connectGeneration;

// Later, in a callback:
if (generation !== this.connectGeneration) {
  return;  // This callback is stale, ignore it
}
```

You'll see `isStale()` checks throughout the connection code.

### 3. Audio Playback Uses "Lookahead Scheduling"

Playing audio chunks one-after-another causes gaps (silence between chunks). The app uses a smarter approach:

```
Instead of: play chunk → wait → play next chunk → wait → ...

We do: schedule chunks 200ms into the future, always keeping
       the next chunk queued up before the current one finishes
```

This is in `lib/audio-streamer.ts`.

### 4. Components Are "Dumb"

All React components are **presentational only**. They receive props and render UI. They don't:
- Make API calls
- Manage complex state
- Handle business logic

All that lives in **hooks**.

---

## The Two Main Features

### Feature 1: Live Session

The core experience. Real-time video + voice with AI.

```
Camera → 1 frame/second → Gemini
Mic → continuous audio → Gemini
Gemini → voice response → Speaker
Gemini → text response → Transcript UI
```

### Feature 2: Snap & Analyze

A separate feature for precise readings. User taps "Snap" button:

1. Captures high-resolution photo (95% JPEG quality)
2. POSTs to `/api/analyze`
3. Uses different AI model (non-streaming, better at reading)
4. Shows result in a bottom sheet

**Use case**: Reading dial numbers, grind settings, temperature displays.

---

## Connection Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                     CONNECTION STATES                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│    idle ──────► connecting ──────► connected                │
│      │              │                   │                   │
│      │              │                   │                   │
│      │              ▼                   ▼                   │
│      │           error ◄──────── reconnecting               │
│      │              │                   │                   │
│      │              │                   │                   │
│      ▼              ▼                   │                   │
│  disconnected ◄─────────────────────────┘                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Auto-reconnect**: If connection drops unexpectedly, the app retries up to 3 times with exponential backoff (1s → 2s → 4s).

---

## API Routes

### `POST /api/token`

**Purpose**: Securely provide API credentials to the browser.

The Gemini API key is secret and lives on the server. This endpoint creates a short-lived, single-use token that the browser can use.

```typescript
// Browser calls:
const { token } = await fetch('/api/token').then(r => r.json());

// Token is:
// - Single use
// - Expires in 15 minutes
// - Has system prompt baked in
```

### `POST /api/analyze`

**Purpose**: Analyze a high-res photo (for "Snap & Analyze" feature).

```typescript
// Request:
{ image: "base64_jpeg_data" }

// Response:
{ analysis: "The dial reads 6.5, temperature shows 200°F..." }
```

---

## Important Constants

From `lib/constants.ts`:

| Constant | Value | What It Means |
|----------|-------|---------------|
| `CAMERA_FPS` | 1 | Send 1 camera frame per second |
| `AUDIO_SAMPLE_RATE_INPUT` | 16000 | Mic records at 16kHz |
| `AUDIO_SAMPLE_RATE_OUTPUT` | 24000 | AI voice plays at 24kHz |
| `RECONNECT_MAX_ATTEMPTS` | 3 | Try reconnecting 3 times |
| `LIVE_MODEL` | `gemini-2.5-flash-native-audio-preview-...` | The AI model |

---

## How to Run Locally

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment**:
   Create `.env.local`:
   ```
   GEMINI_API_KEY=your_google_ai_studio_key
   ```

3. **Start dev server**:
   ```bash
   npm run dev
   ```

4. **Open on your phone**:
   - Find your computer's local IP (e.g., `192.168.1.100`)
   - Open `http://192.168.1.100:3000` on phone
   - Allow camera/mic permissions

---

## Common Tasks

### "Where do I change the AI's personality?"
→ `src/knowledge/system-prompt.ts`

### "Where do I change what equipment the AI knows about?"
→ `src/knowledge/eg1-manual.ts`, `gs3-machine.ts`, etc.

### "Where is the main session logic?"
→ `src/hooks/useLiveSession.ts`

### "Where are the UI components?"
→ `src/components/`

### "How do I add a new button to the control tray?"
→ `src/components/ControlTray.tsx`

### "Where do I change camera frame rate?"
→ `src/lib/constants.ts` → `CAMERA_FPS`

---

## Debugging Tips

### Connection Issues
1. Check browser console for WebSocket errors
2. Verify `.env.local` has valid `GEMINI_API_KEY`
3. Check `/api/token` response in Network tab

### Audio Not Playing
1. Check if AudioContext is suspended (needs user interaction to start)
2. Look at `useAudioPlayback` hook state
3. Verify audio chunks are arriving (log in `onAudio` callback)

### Camera Not Working
1. Check browser permissions
2. Verify `facingMode: "environment"` is supported
3. Test on actual phone (desktop webcam may behave differently)

---

## Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                           BROWSER                                  │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                      SessionView                              │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │ │
│  │  │ CameraView  │ │ControlTray  │ │  TranscriptOverlay      │ │ │
│  │  └─────────────┘ └─────────────┘ └─────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                              │                                     │
│                              │ props/callbacks                     │
│                              ▼                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                    useLiveSession                             │ │
│  │                   (orchestrator hook)                         │ │
│  │                                                               │ │
│  │   ┌────────────────┐  ┌────────────────┐  ┌───────────────┐  │ │
│  │   │useAudioCapture │  │useCameraCapture│  │useAudioPlayback│ │ │
│  │   │   (mic → PCM)  │  │(camera → JPEG) │  │ (PCM → speaker)│ │ │
│  │   └───────┬────────┘  └───────┬────────┘  └───────▲────────┘ │ │
│  │           │                   │                   │          │ │
│  └───────────┼───────────────────┼───────────────────┼──────────┘ │
│              │                   │                   │            │
│              └─────────┬─────────┘                   │            │
│                        │                             │            │
│                        ▼                             │            │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                  GeminiLiveClient                             │ │
│  │                (WebSocket wrapper)                            │ │
│  └──────────────────────────┬───────────────────────────────────┘ │
│                             │                                      │
└─────────────────────────────┼──────────────────────────────────────┘
                              │
                              │ WebSocket (wss://...)
                              │
┌─────────────────────────────┼──────────────────────────────────────┐
│                             ▼                                      │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                    Gemini Live API                            │ │
│  │               gemini-2.5-flash-native-audio                   │ │
│  │                                                               │ │
│  │   ┌─────────────────────────────────────────────────────┐    │ │
│  │   │              System Prompt (knowledge)               │    │ │
│  │   │  • Role & personality                                │    │ │
│  │   │  • EG-1 grinder manual                              │    │ │
│  │   │  • GS3 espresso machine                             │    │ │
│  │   │  • Visual recognition cues                          │    │ │
│  │   └─────────────────────────────────────────────────────┘    │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│                         GOOGLE CLOUD                               │
└────────────────────────────────────────────────────────────────────┘
```

---

## Summary

**Barista Vision** is a real-time AI coach that:

1. **Captures** camera frames (1 fps) and microphone audio (16kHz)
2. **Streams** them over WebSocket to Gemini Live API
3. **Receives** AI voice (24kHz) and text responses
4. **Plays** voice through speaker with gapless scheduling
5. **Displays** transcript on screen

The code is organized as:
- **Components** = visual UI only
- **Hooks** = all business logic
- **Lib** = utilities and infrastructure
- **Knowledge** = AI's domain expertise

Start by reading `useLiveSession.ts` — it's the heart of the application.

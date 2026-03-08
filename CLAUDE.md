# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (Next.js)
npm run build    # Production build
npm run lint     # ESLint
npm test         # Vitest (watch mode)
npm run test:run # Vitest (single run)
```

Type-check with `npx tsc --noEmit`.

## Environment

Requires `.env.local` with `GEMINI_API_KEY` (Google AI Studio key). Optional: `LANGFUSE_PUBLIC_KEY` and `LANGFUSE_SECRET_KEY` for Langfuse observability (app works without them — events log to console only).

## Architecture

Real-time AI assistant: user points phone camera at a physical object, AI sees the video feed and talks them through tasks via voice. Uses Gemini Live API over WebSocket for streaming bidirectional audio + video.

### Data Flow

```
Phone Camera (rear) → JPEG @ 1fps ──→ ┐
Phone Mic → PCM 16kHz ──────────────→ ├─→ Gemini Live API (WebSocket)
                                       │         ↓
Phone Speaker ← PCM 24kHz ←──────────←┤    gemini-2.5-flash-native-audio
Transcript UI ← text ←───────────────←┘
```

The browser connects **directly** to Gemini's WebSocket. No backend relay. `/api/token` creates a single-use **ephemeral token** via `ai.authTokens.create()` — the raw API key never leaves the server.

### Key Layers

**`hooks/useLiveSession.ts`** — Central orchestrator. Manages connection lifecycle, coordinates mic/camera/playback, handles all teardown paths, drives auto-reconnect with exponential backoff (up to 3 attempts). Most complex file in the codebase. Uses a generation counter + attempt-scoped client variable to prevent race conditions (stale WebSocket callbacks, concurrent connect/disconnect, partial startup failures).

**`lib/gemini-live-client.ts`** — WebSocket wrapper around `@google/genai` SDK's `ai.live.connect()`. `connect()` returns a Promise that resolves only after `onopen`. `disconnect()` bumps a generation counter to invalidate in-flight callbacks and rejects pending connect promises. Configures context window compression (trigger at 80k tokens, slide to 40k). Supports session resumption via `resumptionHandle`.

**`lib/audio-streamer.ts`** — Gapless PCM playback via Web Audio API. Uses 200ms lookahead scheduling (not sequential `onended` chaining) to eliminate gaps between chunks.

**`lib/watchdog.ts`** — `WatchdogTimer` monitors AI responsiveness. Fires a nudge after 15s of silence, forces reconnect after 30s. Resets on any audio/text/tool-call output from the model. Paused while the model is actively speaking.

**`lib/state-machine/`** — Workflow enforcement via Gemini function calling. `engine.ts` manages step graph + prerequisite validation. `espresso-workflow.ts` defines the EG-1 espresso pull steps. `function-declarations.ts` exports Gemini tool declarations. `function-handler.ts` processes `advance_step` / `get_workflow_status` calls and returns structured responses. Prevents the model from skipping steps.

**`hooks/useAudioCapture.ts`** — Mic → AudioWorklet (`public/audio-worklet-processor.js`) → Int16 PCM → base64.

**`hooks/useAudioPlayback.ts`** — Manages audio playback lifecycle, wraps `AudioStreamer`.

**`hooks/useCameraCapture.ts`** — Rear camera → canvas downscale (max 1024px wide) → JPEG base64 at 1 FPS.

**`hooks/useSnapAnalyze.ts`** — Captures high-res still, POSTs to `/api/analyze`, manages bottom sheet state.

**`lib/event-collector.ts`** — Client-side observability event batcher. Buffers `SessionEvent`s and flushes via `fetch` (keepalive) at a threshold (10 events) or on a 30s timer. Uses `pagehide`/`visibilitychange` listeners for page-close flushes and `sendBeacon` on `destroy()` with fetch fallback. Single retry on network or non-2xx failure. Typed via `EventDataMap` discriminated union — `track()` is generic and enforces correct payload per event name at compile time.

**`knowledge/`** — Domain knowledge injected as system instruction at connection time. Located at `src/knowledge/` with subdirectories: `equipment/` (EG-1 specs, grind settings, GS3 specs, visual recognition), `personality/` (system-prompt.ts), `workflows/` (EG-1 workflow). `system-prompt.ts` assembles role + personality + all knowledge modules + function-calling instructions into one string. Gemini's 1M context window fits everything inline.

### Components

All components are presentational — logic lives in hooks.

| Component | Purpose |
|-----------|---------|
| `SessionView.tsx` | Main view — camera feed, controls, error/reconnecting states |
| `CameraView.tsx` | Camera preview with status overlay |
| `ControlTray.tsx` | Mic/camera/snap/disconnect buttons |
| `StatusIndicator.tsx` | Animated dot showing AI state (listening/speaking/thinking) |
| `TranscriptOverlay.tsx` | Scrolling transcript of AI speech |
| `ReconnectToast.tsx` | Green toast shown after successful auto-reconnect |
| `SnapAnalyzeSheet.tsx` | Bottom sheet for snap & analyze results |

### Observability

Client-side event collection with server-side Langfuse ingestion. `EventCollector` is created per session in `useLiveSession.connect()` and destroyed on unmount. Tracks session lifecycle events: `session.started`, `session.connected`, `session.disconnected` (reasons: user/error/goaway/watchdog/close), `session.reconnecting`, `session.reconnected`, `session.error`. Each session gets a stable `sessionId`; each WebSocket lifecycle gets a unique `traceId`. Events POST to `/api/events` which validates, logs structured JSON, and ingests to Langfuse via `after()`.

**`lib/langfuse.ts`** — Singleton `Langfuse` client (v3 direct API, not v4 OTel). Returns `null` if `LANGFUSE_PUBLIC_KEY`/`LANGFUSE_SECRET_KEY` env vars are missing (graceful degradation). Uses v3 because our batch-reconstruction use case (pre-recorded events with custom trace IDs and timestamps) doesn't fit v4's live-instrumentation model.

**`lib/langfuse-ingest.ts`** — `ingestEventsToLangfuse()` groups events by `traceId`, upserts Langfuse traces with `sessionId`, creates observations with custom timestamps and level mapping. Unmapped events (Phase 2B: `ai.*`, `workflow.*`, `connection.*`) are silently skipped.

**Key types (`types/events.ts`):** `EventName` (union of all event names), `EventDataMap` (discriminated map enforcing payload shape per event), `SessionEvent<E>` (generic event envelope), `ReconnectReason` (`Exclude<DisconnectReason, "user">`).

### Snap & Analyze

Separate from the live session. Captures a high-res still (95% JPEG quality), POSTs to `/api/analyze` which uses standard `gemini-2.5-flash` (non-streaming) for precise OCR/reading of dial numbers. Results shown in a bottom sheet.

### Connection Resilience

- **Auto-reconnect:** On disconnect/error, retries up to 3 times with exponential backoff (1s → 2s → 4s). GoAway signals skip the first delay for proactive reconnect.
- **Session resumption:** Captures `resumptionHandle` from Gemini and passes it on reconnect to resume context.
- **Context window compression:** Sliding window at 80k tokens, compresses to 40k to prevent context overflow in long sessions.
- **Watchdog:** Detects AI silence — nudges at 15s, force-reconnects at 30s.

### SDK Data Format

The `@google/genai` SDK expects `{ data: base64string, mimeType: string }` plain objects for `sendRealtimeInput()`, NOT browser `Blob` instances. Audio: `"audio/pcm;rate=16000"`, Video: `"image/jpeg"`.

## Important Patterns

- **All media data is base64 strings** throughout the pipeline, never browser Blobs
- **Connection lifecycle is race-condition hardened** — generation counters, attempt-scoped cleanup, staleness checks after every `await`
- **`onError`/`onClose` handlers check `clientRef.current === client`** before teardown to avoid killing a newer session from a stale socket callback
- **Audio/video send methods guard on `this.connected && this.session`** — silently no-op if connection is down
- **State machine enforces step ordering** — model calls `advance_step()` via function calling; handler validates prerequisites before allowing progression
- **EventCollector is fire-and-forget** — `track()` never blocks the main thread; `sendEvents` uses `.then()/.catch()` chains, not `await`
- Components are purely presentational; all logic lives in hooks
- Path alias: `@/*` maps to `./src/*`

## Constants (`lib/constants.ts`)

| Constant | Value | Notes |
|---|---|---|
| `LIVE_MODEL` | `gemini-2.5-flash-native-audio-preview-12-2025` | Native audio model for Live API |
| `ANALYZE_MODEL` | `gemini-2.5-flash` | For snap & analyze |
| `AUDIO_SAMPLE_RATE_INPUT` | 16000 | Mic capture |
| `AUDIO_SAMPLE_RATE_OUTPUT` | 24000 | AI voice playback |
| `AUDIO_CHANNELS` | 1 | Mono audio |
| `CAMERA_FPS` | 1 | Frames per second sent to Gemini |
| `CAMERA_MAX_WIDTH` | 1024 | Max frame width in pixels |
| `CAMERA_JPEG_QUALITY` | 0.8 | Live stream frame quality |
| `CAMERA_SNAP_QUALITY` | 0.95 | High-res snap quality |
| `TOKEN_REFRESH_INTERVAL_MS` | 240000 (4 min) | Ephemeral token refresh interval |
| `EPHEMERAL_TOKEN_EXPIRE_MS` | 900000 (15 min) | Token expiry |
| `RECONNECT_MAX_ATTEMPTS` | 3 | Auto-reconnect retries |
| `RECONNECT_BASE_DELAY_MS` | 1000 | Backoff base: 1s → 2s → 4s |
| `WATCHDOG_NUDGE_MS` | 15000 | Silence before nudge |
| `WATCHDOG_RECONNECT_MS` | 30000 | Silence before force-reconnect |
| `COMPRESSION_TRIGGER_TOKENS` | 80000 | Context compression trigger |
| `COMPRESSION_TARGET_TOKENS` | 40000 | Context compression target |

## Types (`types/session.ts`)

- `SessionStatus`: `"idle" | "connecting" | "connected" | "reconnecting" | "disconnected" | "error"`
- `AIState`: `"idle" | "listening" | "speaking" | "thinking"`
- `SessionState`: Full session state including status, AI state, mic/camera toggles, transcript, error
- `TranscriptEntry`: Single transcript line with role, text, timestamp
- `SnapResult`: Snap & analyze result with image data URL, analysis text, timestamp

## User Preferences

- Never add `Co-Authored-By: Claude` in commit messages
- Don't create documentation files unless explicitly asked

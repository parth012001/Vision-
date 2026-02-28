# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (Next.js)
npm run build    # Production build
npm run lint     # ESLint
```

No test suite configured. Type-check with `npx tsc --noEmit`.

## Environment

Requires `.env.local` with `GEMINI_API_KEY` (Google AI Studio key).

## Architecture

Real-time AI assistant: user points phone camera at a physical object, AI sees the video feed and talks them through tasks via voice. Uses Gemini Live API over WebSocket for streaming bidirectional audio + video.

### Data Flow

```
Phone Camera (rear) → JPEG @ 0.5fps → ┐
Phone Mic → PCM 16kHz ──────────────→ ├─→ Gemini Live API (WebSocket)
                                       │         ↓
Phone Speaker ← PCM 24kHz ←──────────←┤    gemini-live-2.5-flash-preview
Transcript UI ← text ←───────────────←┘
```

The browser connects **directly** to Gemini's WebSocket. No backend relay. `/api/token` serves the API key so it never reaches the client bundle.

### Key Layers

**`hooks/useLiveSession.ts`** — Central orchestrator. Manages connection lifecycle, coordinates mic/camera/playback, handles all teardown paths. Most complex file in the codebase. Uses a generation counter + attempt-scoped client variable to prevent race conditions (stale WebSocket callbacks, concurrent connect/disconnect, partial startup failures).

**`lib/gemini-live-client.ts`** — WebSocket wrapper around `@google/genai` SDK's `ai.live.connect()`. `connect()` returns a Promise that resolves only after `onopen`. `disconnect()` bumps a generation counter to invalidate in-flight callbacks and rejects pending connect promises.

**`lib/audio-streamer.ts`** — Gapless PCM playback via Web Audio API. Uses 200ms lookahead scheduling (not sequential `onended` chaining) to eliminate gaps between chunks.

**`hooks/useAudioCapture.ts`** — Mic → AudioWorklet (`public/audio-worklet-processor.js`) → Int16 PCM → base64. All audio data flows as base64 strings, not browser Blobs.

**`hooks/useCameraCapture.ts`** — Rear camera → canvas downscale → JPEG base64 at 0.5 FPS.

**`knowledge/`** — Domain knowledge injected as system instruction at connection time. `system-prompt.ts` assembles role + personality + all knowledge modules into one string. Gemini's 1M context window fits everything inline.

### Snap & Analyze

Separate from the live session. Captures a high-res still (95% JPEG quality), POSTs to `/api/analyze` which uses standard `gemini-2.5-flash` (non-streaming) for precise OCR/reading of dial numbers. Results shown in a bottom sheet.

### SDK Data Format

The `@google/genai` SDK expects `{ data: base64string, mimeType: string }` plain objects for `sendRealtimeInput()`, NOT browser `Blob` instances. Audio: `"audio/pcm;rate=16000"`, Video: `"image/jpeg"`.

## Important Patterns

- **All media data is base64 strings** throughout the pipeline, never browser Blobs
- **Connection lifecycle is race-condition hardened** — generation counters, attempt-scoped cleanup, staleness checks after every `await`
- **`onError`/`onClose` handlers check `clientRef.current === client`** before teardown to avoid killing a newer session from a stale socket callback
- **Audio/video send methods guard on `this.connected && this.session`** — silently no-op if connection is down
- Components are purely presentational; all logic lives in hooks
- Path alias: `@/*` maps to `./src/*`

## Constants (`lib/constants.ts`)

| Constant | Value | Notes |
|---|---|---|
| `LIVE_MODEL` | `gemini-live-2.5-flash-preview` | Only model family supporting Live API |
| `ANALYZE_MODEL` | `gemini-2.5-flash` | For snap & analyze |
| `AUDIO_SAMPLE_RATE_INPUT` | 16000 | Mic capture |
| `AUDIO_SAMPLE_RATE_OUTPUT` | 24000 | AI voice playback |
| `CAMERA_FPS` | 0.5 | Frames per second sent to Gemini |

## User Preferences

- Never add `Co-Authored-By: Claude` in commit messages
- Don't create documentation files unless explicitly asked

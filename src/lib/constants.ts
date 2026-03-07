export const LIVE_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";
export const ANALYZE_MODEL = "gemini-2.5-flash";

export const AUDIO_SAMPLE_RATE_INPUT = 16000;
export const AUDIO_SAMPLE_RATE_OUTPUT = 24000;
export const AUDIO_CHANNELS = 1;

export const CAMERA_FPS = 1;
export const CAMERA_MAX_WIDTH = 1024;
export const CAMERA_JPEG_QUALITY = 0.8;
export const CAMERA_SNAP_QUALITY = 0.95;

export const TOKEN_REFRESH_INTERVAL_MS = 4 * 60 * 1000; // 4 minutes
export const EPHEMERAL_TOKEN_EXPIRE_MS = 15 * 60 * 1000; // 15 minutes

export const RECONNECT_MAX_ATTEMPTS = 3;
export const RECONNECT_BASE_DELAY_MS = 1000; // 1s → 2s → 4s
export const RECONNECT_TOAST_DURATION_MS = 3000;

export const COMPRESSION_TRIGGER_TOKENS = "80000";
export const COMPRESSION_TARGET_TOKENS = "40000";

export const WATCHDOG_NUDGE_MS = 15_000;
export const WATCHDOG_RECONNECT_MS = 30_000;

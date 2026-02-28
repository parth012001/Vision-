import { CAMERA_MAX_WIDTH, CAMERA_JPEG_QUALITY, CAMERA_SNAP_QUALITY } from "./constants";

/**
 * Capture a JPEG frame from a video element, scaled to max width.
 * Returns a base64-encoded JPEG string (without data URL prefix).
 */
export function captureFrame(
  video: HTMLVideoElement,
  quality: number = CAMERA_JPEG_QUALITY,
  maxWidth: number = CAMERA_MAX_WIDTH
): string | null {
  if (video.readyState < 2) return null;

  const canvas = document.createElement("canvas");
  const scale = Math.min(1, maxWidth / video.videoWidth);
  canvas.width = video.videoWidth * scale;
  canvas.height = video.videoHeight * scale;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", quality);

  // Strip the data:image/jpeg;base64, prefix
  return dataUrl.split(",")[1];
}

/**
 * Capture a high-res frame for snap & analyze.
 */
export function captureHighResFrame(video: HTMLVideoElement): string | null {
  return captureFrame(video, CAMERA_SNAP_QUALITY, video.videoWidth);
}

/**
 * Capture a frame and return the full data URL (for display).
 */
export function captureFrameDataUrl(video: HTMLVideoElement): string | null {
  if (video.readyState < 2) return null;

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.drawImage(video, 0, 0);
  return canvas.toDataURL("image/jpeg", CAMERA_SNAP_QUALITY);
}

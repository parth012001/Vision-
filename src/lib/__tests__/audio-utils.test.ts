import { describe, it, expect } from "vitest";
import {
  pcmToBase64,
  base64ToPcm,
  int16ToFloat32,
  base64ToBlob,
  arrayBufferToBlob,
} from "@/lib/audio-utils";

describe("pcmToBase64", () => {
  it("converts an Int16 PCM ArrayBuffer to base64", () => {
    const int16 = new Int16Array([0, 16384, 32767, -32768]);
    const result = pcmToBase64(int16.buffer as ArrayBuffer);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("handles empty input", () => {
    const empty = new ArrayBuffer(0);
    const result = pcmToBase64(empty);
    expect(result).toBe("");
  });

  it("handles single sample", () => {
    const single = new Int16Array([42]);
    const result = pcmToBase64(single.buffer as ArrayBuffer);
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("base64ToPcm", () => {
  it("converts base64 string back to ArrayBuffer", () => {
    const int16 = new Int16Array([0, 16384, 32767, -32768]);
    const base64 = pcmToBase64(int16.buffer as ArrayBuffer);
    const result = base64ToPcm(base64);
    const restored = new Int16Array(result);
    expect(restored).toEqual(int16);
  });

  it("roundtrips correctly with pcmToBase64", () => {
    const original = new Int16Array([100, -100, 0, 32767, -32768]);
    const base64 = pcmToBase64(original.buffer as ArrayBuffer);
    const restored = new Int16Array(base64ToPcm(base64));
    expect(restored).toEqual(original);
  });

  it("handles empty base64", () => {
    const result = base64ToPcm(btoa(""));
    expect(result.byteLength).toBe(0);
  });
});

describe("int16ToFloat32", () => {
  it("normalizes positive max to ~1.0", () => {
    const input = new Int16Array([32767]);
    const result = int16ToFloat32(input.buffer as ArrayBuffer);
    expect(result[0]).toBeCloseTo(1.0, 4);
  });

  it("normalizes negative max to -1.0", () => {
    const input = new Int16Array([-32768]);
    const result = int16ToFloat32(input.buffer as ArrayBuffer);
    expect(result[0]).toBeCloseTo(-1.0, 4);
  });

  it("normalizes zero to 0.0", () => {
    const input = new Int16Array([0]);
    const result = int16ToFloat32(input.buffer as ArrayBuffer);
    expect(result[0]).toBe(0);
  });

  it("returns correct length Float32Array", () => {
    const input = new Int16Array([1, 2, 3, 4, 5]);
    const result = int16ToFloat32(input.buffer as ArrayBuffer);
    expect(result).toBeInstanceOf(Float32Array);
    expect(result.length).toBe(5);
  });

  it("handles empty input", () => {
    const input = new ArrayBuffer(0);
    const result = int16ToFloat32(input);
    expect(result.length).toBe(0);
  });

  it("values are in [-1.0, 1.0] range", () => {
    const input = new Int16Array([0, 16384, -16384, 32767, -32768]);
    const result = int16ToFloat32(input.buffer as ArrayBuffer);
    for (const val of result) {
      expect(val).toBeGreaterThanOrEqual(-1.0);
      expect(val).toBeLessThanOrEqual(1.0);
    }
  });
});

describe("base64ToBlob", () => {
  it("creates a Blob with correct mime type", () => {
    const b64 = btoa("hello");
    const blob = base64ToBlob(b64, "text/plain");
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("text/plain");
    expect(blob.size).toBe(5);
  });
});

describe("arrayBufferToBlob", () => {
  it("creates a Blob from ArrayBuffer", () => {
    const buffer = new Uint8Array([1, 2, 3]).buffer;
    const blob = arrayBufferToBlob(buffer as ArrayBuffer, "application/octet-stream");
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("application/octet-stream");
    expect(blob.size).toBe(3);
  });
});

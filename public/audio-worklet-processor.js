class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._bufferSize = 2048;
    this._buffer = new Float32Array(this._bufferSize);
    this._writeIndex = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const channelData = input[0];

    for (let i = 0; i < channelData.length; i++) {
      this._buffer[this._writeIndex++] = channelData[i];

      if (this._writeIndex >= this._bufferSize) {
        // Convert Float32 to Int16 PCM
        const int16 = new Int16Array(this._bufferSize);
        for (let j = 0; j < this._bufferSize; j++) {
          const s = Math.max(-1, Math.min(1, this._buffer[j]));
          int16[j] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        this.port.postMessage({
          type: "pcm",
          buffer: int16.buffer,
        }, [int16.buffer]);

        this._buffer = new Float32Array(this._bufferSize);
        this._writeIndex = 0;
      }
    }

    return true;
  }
}

registerProcessor("pcm-processor", PCMProcessor);

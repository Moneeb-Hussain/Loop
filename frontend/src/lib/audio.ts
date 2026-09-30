/**
 * Mic capture that emits PCM16 mono 16 kHz chunks, which is what the backend
 * forwards to AssemblyAI. Uses an AudioWorklet (off the main thread) and
 * falls back to the deprecated ScriptProcessorNode on older browsers.
 */

export const TARGET_SAMPLE_RATE = 16000;

// Batch ~100 ms of audio per message. AssemblyAI rejects chunks shorter
// than 50 ms and very small chunks waste socket overhead.
const CHUNK_SAMPLES = 1600;

const WORKLET_SOURCE = `
class PcmForwarder extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (channel) this.port.postMessage(channel.slice(0));
    return true;
  }
}
registerProcessor("pcm-forwarder", PcmForwarder);
`;

/** Downsample by averaging each window, which is less aliased than dropping samples. */
export function downsampleToPcm16(input: Float32Array, sourceRate: number, targetRate = TARGET_SAMPLE_RATE): Int16Array {
  const ratio = sourceRate / targetRate;
  const outputLength = Math.floor(input.length / ratio);
  const output = new Int16Array(outputLength);
  for (let index = 0; index < outputLength; index += 1) {
    const start = Math.floor(index * ratio);
    const end = Math.min(input.length, Math.floor((index + 1) * ratio));
    let sum = 0;
    for (let cursor = start; cursor < end; cursor += 1) sum += input[cursor];
    const sample = Math.max(-1, Math.min(1, sum / Math.max(1, end - start)));
    output[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return output;
}

export interface MicCapture {
  stop: () => void;
}

export async function startMicCapture(
  onChunk: (pcm: ArrayBuffer) => void,
  onLevel: (level: number) => void
): Promise<MicCapture> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
  });

  const context = new AudioContext();
  const source = context.createMediaStreamSource(stream);
  let pending = new Int16Array(0);
  let lastLevelAt = 0;

  const handleSamples = (samples: Float32Array) => {
    const now = performance.now();
    if (now - lastLevelAt > 60) {
      lastLevelAt = now;
      let sum = 0;
      for (let index = 0; index < samples.length; index += 1) sum += samples[index] * samples[index];
      onLevel(Math.min(1, Math.sqrt(sum / samples.length) * 4));
    }

    const pcm = downsampleToPcm16(samples, context.sampleRate);
    const merged = new Int16Array(pending.length + pcm.length);
    merged.set(pending);
    merged.set(pcm, pending.length);
    pending = merged;

    while (pending.length >= CHUNK_SAMPLES) {
      onChunk(pending.slice(0, CHUNK_SAMPLES).buffer);
      pending = pending.slice(CHUNK_SAMPLES);
    }
  };

  let node: AudioNode;
  if (context.audioWorklet) {
    const url = URL.createObjectURL(new Blob([WORKLET_SOURCE], { type: "application/javascript" }));
    try {
      await context.audioWorklet.addModule(url);
    } finally {
      URL.revokeObjectURL(url);
    }
    const worklet = new AudioWorkletNode(context, "pcm-forwarder");
    worklet.port.onmessage = (event: MessageEvent<Float32Array>) => handleSamples(event.data);
    node = worklet;
  } else {
    const processor = context.createScriptProcessor(4096, 1, 1);
    processor.onaudioprocess = (event) => handleSamples(event.inputBuffer.getChannelData(0));
    node = processor;
  }

  // Route through a muted gain so the graph keeps pulling audio without
  // playing the mic back through the speakers.
  const mute = context.createGain();
  mute.gain.value = 0;
  source.connect(node);
  node.connect(mute);
  mute.connect(context.destination);

  return {
    stop: () => {
      source.disconnect();
      node.disconnect();
      mute.disconnect();
      stream.getTracks().forEach((track) => track.stop());
      void context.close();
      onLevel(0);
    },
  };
}

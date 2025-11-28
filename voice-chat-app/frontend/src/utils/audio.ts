/**
 * Audio utilities for capturing microphone input and playing back audio.
 * Supports dynamic sample rates for different agents:
 * - OpenAI: 24kHz
 * - ElevenLabs: 16kHz
 */

const DEFAULT_SAMPLE_RATE = 24000; // Default to OpenAI's 24kHz
const CHUNK_DURATION_MS = 100; // Send chunks every 100ms

export interface AudioCaptureOptions {
  onAudioData: (data: ArrayBuffer) => void;
  onError: (error: Error) => void;
  sampleRate?: number; // Allow custom sample rate
}

/**
 * AudioCapture class handles microphone input and converts to PCM16
 * Supports dynamic sample rates (24kHz for OpenAI, 16kHz for ElevenLabs)
 */
export class AudioCapture {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private onAudioData: (data: ArrayBuffer) => void;
  private onError: (error: Error) => void;
  private sampleRate: number;
  private isCapturing = false;

  constructor(options: AudioCaptureOptions) {
    this.onAudioData = options.onAudioData;
    this.onError = options.onError;
    this.sampleRate = options.sampleRate || DEFAULT_SAMPLE_RATE;
  }

  async start(): Promise<void> {
    if (this.isCapturing) return;

    try {
      // Request microphone permission
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: this.sampleRate,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      // Create audio context
      this.audioContext = new AudioContext({ sampleRate: this.sampleRate });

      // Load the audio worklet processor
      await this.audioContext.audioWorklet.addModule(
        URL.createObjectURL(
          new Blob([AUDIO_PROCESSOR_CODE], { type: 'application/javascript' })
        )
      );

      // Create source from media stream
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Create worklet node
      this.workletNode = new AudioWorkletNode(this.audioContext, 'audio-processor', {
        processorOptions: {
          chunkDurationMs: CHUNK_DURATION_MS,
          sampleRate: this.sampleRate,
        },
      });

      // Handle audio data from worklet
      this.workletNode.port.onmessage = (event) => {
        if (event.data.type === 'audio') {
          this.onAudioData(event.data.buffer);
        }
      };

      // Connect nodes
      this.sourceNode.connect(this.workletNode);
      this.workletNode.connect(this.audioContext.destination);

      this.isCapturing = true;
      console.log('[AUDIO] Started capture at', this.audioContext.sampleRate, 'Hz');
    } catch (error) {
      this.onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  getSampleRate(): number {
    return this.sampleRate;
  }

  stop(): void {
    if (!this.isCapturing) return;

    // Disconnect and clean up
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    this.isCapturing = false;
    console.log('[AUDIO] Stopped capture');
  }

  get capturing(): boolean {
    return this.isCapturing;
  }
}

/**
 * AudioPlayback class handles playing PCM16 audio chunks
 * Supports dynamic sample rates
 */
export class AudioPlayback {
  private audioContext: AudioContext | null = null;
  private scheduledTime = 0;
  private isPlaying = false;
  private sampleRate: number;

  constructor(sampleRate: number = DEFAULT_SAMPLE_RATE) {
    this.sampleRate = sampleRate;
    this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
  }

  /**
   * Update the sample rate (recreates audio context)
   */
  setSampleRate(sampleRate: number): void {
    if (this.sampleRate === sampleRate) return;
    
    this.sampleRate = sampleRate;
    if (this.audioContext) {
      this.audioContext.close();
    }
    this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
    this.scheduledTime = 0;
    console.log('[AudioPlayback] Sample rate changed to:', sampleRate, 'Hz');
  }

  /**
   * Play PCM16 audio data
   */
  play(pcm16Data: ArrayBuffer): void {
    console.log('[AudioPlayback] Playing PCM16 data, size:', pcm16Data.byteLength);
    
    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
      console.log('[AudioPlayback] Created AudioContext with sample rate:', this.sampleRate);
    }

    // Resume context if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      console.log('[AudioPlayback] Resuming suspended AudioContext');
      this.audioContext.resume();
    }

    // Convert PCM16 to Float32
    const int16Array = new Int16Array(pcm16Data);
    const float32Array = new Float32Array(int16Array.length);

    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768;
    }

    console.log('[AudioPlayback] Converted to Float32, samples:', float32Array.length);

    // Create audio buffer
    const audioBuffer = this.audioContext.createBuffer(
      1, // mono
      float32Array.length,
      this.sampleRate
    );
    audioBuffer.getChannelData(0).set(float32Array);

    // Create buffer source
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    // Schedule playback
    const currentTime = this.audioContext.currentTime;
    const startTime = Math.max(currentTime, this.scheduledTime);
    source.start(startTime);

    console.log('[AudioPlayback] Scheduled playback at:', startTime, 'duration:', audioBuffer.duration);

    this.scheduledTime = startTime + audioBuffer.duration;
    this.isPlaying = true;

    source.onended = () => {
      if (this.scheduledTime <= (this.audioContext?.currentTime ?? 0)) {
        this.isPlaying = false;
      }
    };
  }

  /**
   * Stop all playback
   */
  stop(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
    }
    this.scheduledTime = 0;
    this.isPlaying = false;
  }

  get playing(): boolean {
    return this.isPlaying;
  }
}

/**
 * Audio worklet processor code (runs in separate thread)
 * Collects audio samples and sends them as PCM16 chunks
 */
const AUDIO_PROCESSOR_CODE = `
class AudioProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.chunkSize = Math.floor(
      (options.processorOptions.chunkDurationMs / 1000) * 
      options.processorOptions.sampleRate
    );
    this.buffer = new Float32Array(this.chunkSize);
    this.bufferIndex = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const samples = input[0];

    for (let i = 0; i < samples.length; i++) {
      this.buffer[this.bufferIndex++] = samples[i];

      if (this.bufferIndex >= this.chunkSize) {
        // Convert Float32 to PCM16
        const pcm16 = new Int16Array(this.chunkSize);
        for (let j = 0; j < this.chunkSize; j++) {
          const s = Math.max(-1, Math.min(1, this.buffer[j]));
          pcm16[j] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Send to main thread
        this.port.postMessage({
          type: 'audio',
          buffer: pcm16.buffer,
        }, [pcm16.buffer]);

        // Reset buffer
        this.buffer = new Float32Array(this.chunkSize);
        this.bufferIndex = 0;
      }
    }

    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);
`;

/**
 * Convert Float32Array to Int16Array (PCM16)
 */
export function float32ToPcm16(float32: Float32Array): Int16Array {
  const pcm16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return pcm16;
}

/**
 * Convert Int16Array (PCM16) to Float32Array
 */
export function pcm16ToFloat32(pcm16: Int16Array): Float32Array {
  const float32 = new Float32Array(pcm16.length);
  for (let i = 0; i < pcm16.length; i++) {
    float32[i] = pcm16[i] / 32768;
  }
  return float32;
}


import { BaseProvider } from './BaseProvider';
import type {
  ProviderId,
  ProviderInfo,
  Voice,
  Model,
  AudioChunk,
  LatencyMetrics,
  Message,
} from '../types';

const OPENAI_VOICES: Voice[] = [
  { id: 'alloy', name: 'Alloy', gender: 'neutral' },
  { id: 'ash', name: 'Ash', gender: 'male' },
  { id: 'ballad', name: 'Ballad', gender: 'female' },
  { id: 'coral', name: 'Coral', gender: 'female' },
  { id: 'echo', name: 'Echo', gender: 'male' },
  { id: 'fable', name: 'Fable', gender: 'female' },
  { id: 'nova', name: 'Nova', gender: 'female' },
  { id: 'onyx', name: 'Onyx', gender: 'male' },
  { id: 'sage', name: 'Sage', gender: 'female' },
  { id: 'shimmer', name: 'Shimmer', gender: 'female' },
  { id: 'verse', name: 'Verse', gender: 'male' },
];

const OPENAI_MODELS: Model[] = [
  { id: 'gpt-4o-realtime-preview', name: 'GPT-4o Realtime', description: 'Full capability realtime model', latency: 'low' },
  { id: 'gpt-4o-mini-realtime-preview', name: 'GPT-4o Mini Realtime', description: 'Faster, more affordable', latency: 'low' },
];

export class OpenAIProvider extends BaseProvider {
  id: ProviderId = 'openai';
  name = 'OpenAI Realtime';

  info: ProviderInfo = {
    id: 'openai',
    name: 'OpenAI Realtime',
    description: 'Full conversational AI with integrated LLM and voice',
    color: '#10a37f',
    supportsStreaming: true,
    supportsConversation: true,
    defaultVoices: OPENAI_VOICES,
    defaultModels: OPENAI_MODELS,
  };

  private ws: WebSocket | null = null;
  private audioChunks: ArrayBuffer[] = [];
  private responseResolver: ((value: { text: string; audio: Blob; metrics: LatencyMetrics }) => void) | null = null;
  private startTime = 0;
  private ttfb = 0;
  private responseText = '';

  async getVoices(): Promise<Voice[]> {
    return OPENAI_VOICES;
  }

  async getModels(): Promise<Model[]> {
    return OPENAI_MODELS;
  }

  async connect(): Promise<void> {
    if (!this.config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    const model = this.config.modelId || 'gpt-4o-realtime-preview';
    const url = `wss://api.openai.com/v1/realtime?model=${model}`;

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        // Send authorization
        this.ws?.send(JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            voice: this.config.voiceId || 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1',
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500,
            },
          },
        }));
        this.connected = true;
        resolve();
      };

      this.ws.onerror = (error) => {
        this.emitError(new Error('WebSocket error'));
        reject(error);
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data));
      };

      this.ws.onclose = () => {
        this.connected = false;
      };
    });
  }

  private handleMessage(message: { type: string; [key: string]: unknown }): void {
    switch (message.type) {
      case 'session.created':
      case 'session.updated':
        console.log('OpenAI session ready');
        break;

      case 'response.audio.delta':
        if (this.ttfb === 0) {
          this.ttfb = Date.now() - this.startTime;
        }
        const audioData = message.delta as string;
        const binaryData = Uint8Array.from(atob(audioData), c => c.charCodeAt(0));
        this.audioChunks.push(binaryData.buffer);
        break;

      case 'response.audio_transcript.delta':
        this.responseText += message.delta as string;
        break;

      case 'response.done':
        this.finalizeResponse();
        break;

      case 'error':
        this.emitError(new Error((message.error as { message: string })?.message || 'Unknown error'));
        break;
    }
  }

  private finalizeResponse(): void {
    if (this.responseResolver) {
      const totalTime = Date.now() - this.startTime;

      // Combine audio chunks
      const totalLength = this.audioChunks.reduce((acc, chunk) => acc + chunk.byteLength, 0);
      const combinedBuffer = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of this.audioChunks) {
        combinedBuffer.set(new Uint8Array(chunk), offset);
        offset += chunk.byteLength;
      }

      // Create WAV blob from PCM data
      const audioBlob = this.createWavBlob(combinedBuffer, 24000);

      const metrics: LatencyMetrics = {
        ttfb: this.ttfb,
        totalTime,
        audioDuration: (combinedBuffer.length / 2 / 24000) * 1000, // 16-bit samples at 24kHz
        characterCount: this.responseText.length,
        estimatedCost: this.calculateCost(this.responseText.length),
      };

      this.responseResolver({
        text: this.responseText,
        audio: audioBlob,
        metrics,
      });

      // Reset state
      this.audioChunks = [];
      this.responseResolver = null;
      this.responseText = '';
      this.ttfb = 0;
    }
  }

  private createWavBlob(pcmData: Uint8Array, sampleRate: number): Blob {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = pcmData.length;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // WAV header
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    // PCM data
    const wavData = new Uint8Array(buffer);
    wavData.set(pcmData, 44);

    return new Blob([buffer], { type: 'audio/wav' });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    super.disconnect();
  }

  async synthesize(text: string): Promise<{ audio: Blob; metrics: LatencyMetrics }> {
    // For OpenAI Realtime, we use the conversation method
    const result = await this.sendConversationMessage(text, [], '');
    return { audio: result.audio, metrics: result.metrics };
  }

  async synthesizeStream(
    text: string,
    onChunk: (chunk: AudioChunk) => void,
    onComplete: (metrics: LatencyMetrics) => void
  ): Promise<void> {
    const result = await this.synthesize(text);
    onChunk({
      data: await result.audio.arrayBuffer(),
      timestamp: Date.now(),
      isFinal: true,
    });
    onComplete(result.metrics);
  }

  async sendConversationMessage(
    input: string | Blob,
    _history: Message[],
    systemPrompt: string
  ): Promise<{ text: string; audio: Blob; metrics: LatencyMetrics }> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    this.startTime = Date.now();
    this.audioChunks = [];
    this.responseText = '';
    this.ttfb = 0;

    return new Promise((resolve, reject) => {
      this.responseResolver = resolve;

      // Update system prompt if provided
      if (systemPrompt) {
        this.ws?.send(JSON.stringify({
          type: 'session.update',
          session: {
            instructions: systemPrompt,
          },
        }));
      }

      // Send the message
      if (typeof input === 'string') {
        this.ws?.send(JSON.stringify({
          type: 'conversation.item.create',
          item: {
            type: 'message',
            role: 'user',
            content: [{ type: 'input_text', text: input }],
          },
        }));
      } else {
        // Handle audio input - convert blob to base64
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          this.ws?.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: base64,
          }));
          this.ws?.send(JSON.stringify({
            type: 'input_audio_buffer.commit',
          }));
        };
        reader.readAsDataURL(input);
      }

      // Request response
      this.ws?.send(JSON.stringify({
        type: 'response.create',
      }));

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.responseResolver) {
          this.responseResolver = null;
          reject(new Error('Response timeout'));
        }
      }, 30000);
    });
  }

  protected calculateCost(characterCount: number): number {
    // OpenAI Realtime pricing is complex, approximating
    return (characterCount / 1000) * 0.06;
  }
}

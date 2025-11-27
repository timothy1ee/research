import { BaseProvider } from './BaseProvider';
import type {
  ProviderId,
  ProviderInfo,
  Voice,
  Model,
  AudioChunk,
  LatencyMetrics,
} from '../types';

const CARTESIA_VOICES: Voice[] = [
  { id: 'a0e99841-438c-4a64-b679-ae501e7d6091', name: 'Barbershop Man', gender: 'male' },
  { id: '156fb8d2-335b-4950-9cb3-a2d33f9cb6dc', name: 'British Lady', gender: 'female' },
  { id: '638efaaa-4d0c-442e-b701-3fae16aad012', name: 'California Girl', gender: 'female' },
  { id: '5619d38c-cf51-4d8e-9575-48f61a280413', name: 'Confident British Man', gender: 'male' },
  { id: '87748186-23bb-4f7c-bce1-1a4de8b8ad86', name: 'Doctor Mischief', gender: 'male' },
  { id: 'c45bc5ec-dc68-4feb-8829-6e6b2748095d', name: 'Helpful Woman', gender: 'female' },
  { id: 'e13cae5c-ec59-4f71-b0a6-266df3c9bb8e', name: 'Movieman', gender: 'male' },
  { id: '41534e16-2966-4c6b-9670-111411def906', name: 'Newsman', gender: 'male' },
  { id: '79a125e8-cd45-4c13-8a67-188112f4dd22', name: 'Commercial Lady', gender: 'female' },
  { id: 'a167e0f3-df7e-4d52-a9c3-f949145efdab', name: 'Sportsman', gender: 'male' },
];

const CARTESIA_MODELS: Model[] = [
  { id: 'sonic-2024-10-01', name: 'Sonic', description: 'Ultra-fast streaming TTS', latency: 'low' },
  { id: 'sonic-english-2024-10-01', name: 'Sonic English', description: 'English-optimized', latency: 'low' },
  { id: 'sonic-multilingual-2024-10-01', name: 'Sonic Multilingual', description: '40+ languages', latency: 'low' },
];

export class CartesiaProvider extends BaseProvider {
  id: ProviderId = 'cartesia';
  name = 'Cartesia Sonic';

  info: ProviderInfo = {
    id: 'cartesia',
    name: 'Cartesia Sonic',
    description: 'Ultra-fast streaming TTS with emotion support',
    color: '#f59e0b',
    supportsStreaming: true,
    supportsConversation: false,
    defaultVoices: CARTESIA_VOICES,
    defaultModels: CARTESIA_MODELS,
  };

  private ws: WebSocket | null = null;
  private contextId: string | null = null;

  async getVoices(): Promise<Voice[]> {
    if (!this.config.apiKey) {
      return CARTESIA_VOICES;
    }

    try {
      const response = await fetch('https://api.cartesia.ai/voices', {
        headers: {
          'X-API-Key': this.config.apiKey,
          'Cartesia-Version': '2024-06-10',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch voices');
      }

      const voices = await response.json();
      return voices.map((v: { id: string; name: string; description?: string }) => ({
        id: v.id,
        name: v.name,
        gender: v.description?.toLowerCase().includes('female') ? 'female' : 'male',
      }));
    } catch (error) {
      console.warn('Failed to fetch Cartesia voices, using defaults:', error);
      return CARTESIA_VOICES;
    }
  }

  async getModels(): Promise<Model[]> {
    return CARTESIA_MODELS;
  }

  async connect(): Promise<void> {
    if (!this.config.apiKey) {
      throw new Error('Cartesia API key is required');
    }
    this.connected = true;
  }

  async synthesize(text: string): Promise<{ audio: Blob; metrics: LatencyMetrics }> {
    if (!this.config.apiKey) {
      throw new Error('Cartesia API key is required');
    }

    const voiceId = this.config.voiceId || CARTESIA_VOICES[0].id;
    const modelId = this.config.modelId || 'sonic-english-2024-10-01';
    const startTime = Date.now();
    let ttfb = 0;

    const response = await fetch('https://api.cartesia.ai/tts/bytes', {
      method: 'POST',
      headers: {
        'X-API-Key': this.config.apiKey,
        'Cartesia-Version': '2024-06-10',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model_id: modelId,
        transcript: text,
        voice: {
          mode: 'id',
          id: voiceId,
        },
        output_format: {
          container: 'mp3',
          bit_rate: 128000,
        },
      }),
    });

    ttfb = Date.now() - startTime;

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Cartesia API error: ${error}`);
    }

    const audioBlob = await response.blob();
    const totalTime = Date.now() - startTime;

    // Estimate audio duration from MP3 blob size
    const audioDuration = (audioBlob.size * 8) / 128000 * 1000;

    const metrics: LatencyMetrics = {
      ttfb,
      totalTime,
      audioDuration,
      characterCount: text.length,
      estimatedCost: this.calculateCost(text.length),
    };

    return { audio: audioBlob, metrics };
  }

  async synthesizeStream(
    text: string,
    onChunk: (chunk: AudioChunk) => void,
    onComplete: (metrics: LatencyMetrics) => void
  ): Promise<void> {
    if (!this.config.apiKey) {
      throw new Error('Cartesia API key is required');
    }

    const voiceId = this.config.voiceId || CARTESIA_VOICES[0].id;
    const modelId = this.config.modelId || 'sonic-english-2024-10-01';
    const startTime = Date.now();
    let ttfb = 0;
    let totalBytes = 0;

    // Use WebSocket for streaming
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`wss://api.cartesia.ai/tts/websocket?api_key=${this.config.apiKey}&cartesia_version=2024-06-10`);

      ws.onopen = () => {
        this.contextId = crypto.randomUUID();
        ws.send(JSON.stringify({
          model_id: modelId,
          transcript: text,
          voice: {
            mode: 'id',
            id: voiceId,
          },
          context_id: this.contextId,
          output_format: {
            container: 'raw',
            encoding: 'pcm_s16le',
            sample_rate: 24000,
          },
        }));
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'chunk') {
          if (ttfb === 0) {
            ttfb = Date.now() - startTime;
          }

          const audioData = Uint8Array.from(atob(data.data), c => c.charCodeAt(0));
          totalBytes += audioData.length;

          onChunk({
            data: audioData.buffer,
            timestamp: Date.now(),
            isFinal: false,
          });
        } else if (data.type === 'done') {
          ws.close();

          const totalTime = Date.now() - startTime;
          const audioDuration = (totalBytes / 2 / 24000) * 1000; // 16-bit samples at 24kHz

          onComplete({
            ttfb,
            totalTime,
            audioDuration,
            characterCount: text.length,
            estimatedCost: this.calculateCost(text.length),
          });

          resolve();
        }
      };

      ws.onerror = () => {
        reject(new Error('WebSocket error'));
      };

      ws.onclose = () => {
        this.ws = null;
      };

      this.ws = ws;
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    super.disconnect();
  }

  protected calculateCost(characterCount: number): number {
    // Cartesia Sonic pricing: ~$0.038 per 1K characters
    return (characterCount / 1000) * 0.038;
  }
}

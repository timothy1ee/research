import { BaseProvider } from './BaseProvider';
import type {
  ProviderId,
  ProviderInfo,
  Voice,
  Model,
  AudioChunk,
  LatencyMetrics,
} from '../types';

const ELEVENLABS_VOICES: Voice[] = [
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', gender: 'female' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', gender: 'male' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', gender: 'female' },
  { id: 'bIHbv24MWmeRgasZH58o', name: 'Will', gender: 'male' },
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', gender: 'female' },
  { id: 'cjVigY5qzO86Huf0OWal', name: 'Eric', gender: 'male' },
  { id: 'iP95p4xoKVk53GoZ742B', name: 'Chris', gender: 'male' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', gender: 'male' },
  { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', gender: 'female' },
  { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice', gender: 'female' },
];

const ELEVENLABS_MODELS: Model[] = [
  { id: 'eleven_flash_v2_5', name: 'Flash v2.5', description: 'Ultra-low latency, 32 languages', latency: 'low' },
  { id: 'eleven_turbo_v2_5', name: 'Turbo v2.5', description: 'Low latency, 32 languages', latency: 'low' },
  { id: 'eleven_turbo_v2', name: 'Turbo v2', description: 'English-only, optimized speed', latency: 'low' },
  { id: 'eleven_multilingual_v2', name: 'Multilingual v2', description: 'Highest quality, 29 languages', latency: 'medium' },
];

export class ElevenLabsProvider extends BaseProvider {
  id: ProviderId = 'elevenlabs';
  name = 'ElevenLabs';

  info: ProviderInfo = {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    description: 'High-quality voice synthesis with extensive voice library',
    color: '#8b5cf6',
    supportsStreaming: true,
    supportsConversation: false,
    defaultVoices: ELEVENLABS_VOICES,
    defaultModels: ELEVENLABS_MODELS,
  };

  // WebSocket support available but not used in current implementation

  async getVoices(): Promise<Voice[]> {
    if (!this.config.apiKey) {
      return ELEVENLABS_VOICES;
    }

    try {
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: {
          'xi-api-key': this.config.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch voices');
      }

      const data = await response.json();
      return data.voices.map((v: { voice_id: string; name: string; labels?: { gender?: string } }) => ({
        id: v.voice_id,
        name: v.name,
        gender: v.labels?.gender as 'male' | 'female' | undefined,
      }));
    } catch (error) {
      console.warn('Failed to fetch ElevenLabs voices, using defaults:', error);
      return ELEVENLABS_VOICES;
    }
  }

  async getModels(): Promise<Model[]> {
    return ELEVENLABS_MODELS;
  }

  async connect(): Promise<void> {
    // ElevenLabs uses per-request connections, so we just validate the API key
    if (!this.config.apiKey) {
      throw new Error('ElevenLabs API key is required');
    }
    this.connected = true;
  }

  async synthesize(text: string): Promise<{ audio: Blob; metrics: LatencyMetrics }> {
    if (!this.config.apiKey) {
      throw new Error('ElevenLabs API key is required');
    }

    const voiceId = this.config.voiceId || ELEVENLABS_VOICES[0].id;
    const modelId = this.config.modelId || 'eleven_flash_v2_5';

    const startTime = Date.now();
    let ttfb = 0;

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': this.config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    ttfb = Date.now() - startTime;

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ElevenLabs API error: ${error}`);
    }

    const audioBlob = await response.blob();
    const totalTime = Date.now() - startTime;

    // Estimate audio duration from blob size (MP3 ~128kbps)
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
      throw new Error('ElevenLabs API key is required');
    }

    const voiceId = this.config.voiceId || ELEVENLABS_VOICES[0].id;
    const modelId = this.config.modelId || 'eleven_flash_v2_5';

    const startTime = Date.now();
    let ttfb = 0;
    let totalBytes = 0;

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': this.config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ElevenLabs API error: ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      if (ttfb === 0) {
        ttfb = Date.now() - startTime;
      }

      totalBytes += value.length;

      onChunk({
        data: value.buffer,
        timestamp: Date.now(),
        isFinal: false,
      });
    }

    const totalTime = Date.now() - startTime;
    const audioDuration = (totalBytes * 8) / 128000 * 1000;

    onComplete({
      ttfb,
      totalTime,
      audioDuration,
      characterCount: text.length,
      estimatedCost: this.calculateCost(text.length),
    });
  }

  protected calculateCost(characterCount: number): number {
    // ElevenLabs Flash pricing: ~$0.05 per 1K characters
    return (characterCount / 1000) * 0.05;
  }
}

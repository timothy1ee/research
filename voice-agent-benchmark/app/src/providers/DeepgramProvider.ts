import { BaseProvider } from './BaseProvider';
import type {
  ProviderId,
  ProviderInfo,
  Voice,
  Model,
  AudioChunk,
  LatencyMetrics,
} from '../types';

const DEEPGRAM_VOICES: Voice[] = [
  { id: 'aura-asteria-en', name: 'Asteria', gender: 'female', accent: 'US' },
  { id: 'aura-luna-en', name: 'Luna', gender: 'female', accent: 'US' },
  { id: 'aura-stella-en', name: 'Stella', gender: 'female', accent: 'US' },
  { id: 'aura-athena-en', name: 'Athena', gender: 'female', accent: 'UK' },
  { id: 'aura-hera-en', name: 'Hera', gender: 'female', accent: 'US' },
  { id: 'aura-orion-en', name: 'Orion', gender: 'male', accent: 'US' },
  { id: 'aura-arcas-en', name: 'Arcas', gender: 'male', accent: 'US' },
  { id: 'aura-perseus-en', name: 'Perseus', gender: 'male', accent: 'US' },
  { id: 'aura-angus-en', name: 'Angus', gender: 'male', accent: 'Irish' },
  { id: 'aura-orpheus-en', name: 'Orpheus', gender: 'male', accent: 'US' },
  { id: 'aura-helios-en', name: 'Helios', gender: 'male', accent: 'UK' },
  { id: 'aura-zeus-en', name: 'Zeus', gender: 'male', accent: 'US' },
];

const DEEPGRAM_MODELS: Model[] = [
  { id: 'aura-2', name: 'Aura 2', description: 'Latest generation, 40+ voices', latency: 'low' },
  { id: 'aura', name: 'Aura', description: 'Original Aura model', latency: 'low' },
];

export class DeepgramProvider extends BaseProvider {
  id: ProviderId = 'deepgram';
  name = 'Deepgram Aura';

  info: ProviderInfo = {
    id: 'deepgram',
    name: 'Deepgram Aura',
    description: 'Fast and affordable TTS with multiple accents',
    color: '#13ef93',
    supportsStreaming: true,
    supportsConversation: false,
    defaultVoices: DEEPGRAM_VOICES,
    defaultModels: DEEPGRAM_MODELS,
  };

  async getVoices(): Promise<Voice[]> {
    return DEEPGRAM_VOICES;
  }

  async getModels(): Promise<Model[]> {
    return DEEPGRAM_MODELS;
  }

  async connect(): Promise<void> {
    if (!this.config.apiKey) {
      throw new Error('Deepgram API key is required');
    }
    this.connected = true;
  }

  async synthesize(text: string): Promise<{ audio: Blob; metrics: LatencyMetrics }> {
    if (!this.config.apiKey) {
      throw new Error('Deepgram API key is required');
    }

    const voiceId = this.config.voiceId || 'aura-asteria-en';
    const startTime = Date.now();
    let ttfb = 0;

    const response = await fetch(
      `https://api.deepgram.com/v1/speak?model=${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      }
    );

    ttfb = Date.now() - startTime;

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Deepgram API error: ${error}`);
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
      throw new Error('Deepgram API key is required');
    }

    const voiceId = this.config.voiceId || 'aura-asteria-en';
    const startTime = Date.now();
    let ttfb = 0;
    let totalBytes = 0;

    const response = await fetch(
      `https://api.deepgram.com/v1/speak?model=${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Deepgram API error: ${error}`);
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
    // Deepgram Aura pricing: $0.03 per 1K characters
    return (characterCount / 1000) * 0.03;
  }
}

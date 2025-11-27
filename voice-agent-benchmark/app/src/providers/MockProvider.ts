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

const MOCK_VOICES: Voice[] = [
  { id: 'mock-alice', name: 'Alice', gender: 'female' },
  { id: 'mock-bob', name: 'Bob', gender: 'male' },
  { id: 'mock-carol', name: 'Carol', gender: 'female' },
  { id: 'mock-david', name: 'David', gender: 'male' },
];

const MOCK_MODELS: Model[] = [
  { id: 'mock-fast', name: 'Mock Fast', description: 'Simulated fast response', latency: 'low' },
  { id: 'mock-quality', name: 'Mock Quality', description: 'Simulated quality response', latency: 'medium' },
];

// Sample responses for the mock provider
const SAMPLE_RESPONSES = [
  "That's an interesting question! Let me think about that for a moment.",
  "I understand what you're saying. Here's my perspective on that.",
  "Great point! I'd like to add a few thoughts to that.",
  "That's a fascinating topic. There are several aspects to consider here.",
  "I appreciate you bringing that up. Let me share some insights.",
  "Absolutely! I'm happy to help you with that.",
  "That's something I've given a lot of thought to.",
  "Excellent question! Here's what I know about that topic.",
];

export class MockProvider extends BaseProvider {
  id: ProviderId = 'openai'; // Can be set dynamically
  name = 'Mock Provider';

  info: ProviderInfo = {
    id: 'openai',
    name: 'Mock Provider',
    description: 'Simulated provider for testing without API keys',
    color: '#6366f1',
    supportsStreaming: true,
    supportsConversation: true,
    defaultVoices: MOCK_VOICES,
    defaultModels: MOCK_MODELS,
  };

  private speechSynthesis: SpeechSynthesis | null = null;
  private availableVoices: SpeechSynthesisVoice[] = [];

  constructor(providerId?: ProviderId, name?: string, color?: string) {
    super();
    if (providerId) {
      this.id = providerId;
      this.info.id = providerId;
    }
    if (name) {
      this.name = name;
      this.info.name = name;
    }
    if (color) {
      this.info.color = color;
    }

    // Initialize Web Speech API if available
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      this.speechSynthesis = window.speechSynthesis;
      this.loadVoices();
    }
  }

  private loadVoices(): void {
    const loadVoiceList = () => {
      this.availableVoices = this.speechSynthesis?.getVoices() || [];
    };

    loadVoiceList();

    if (this.speechSynthesis) {
      this.speechSynthesis.onvoiceschanged = loadVoiceList;
    }
  }

  async getVoices(): Promise<Voice[]> {
    // Return browser voices if available
    if (this.availableVoices.length > 0) {
      return this.availableVoices.slice(0, 10).map((v, i) => ({
        id: `browser-${i}`,
        name: v.name,
        language: v.lang,
        gender: v.name.toLowerCase().includes('female') ? 'female' as const : 'male' as const,
      }));
    }
    return MOCK_VOICES;
  }

  async getModels(): Promise<Model[]> {
    return MOCK_MODELS;
  }

  async connect(): Promise<void> {
    // Mock provider is always "connected"
    this.connected = true;
  }

  async synthesize(text: string): Promise<{ audio: Blob; metrics: LatencyMetrics }> {
    const startTime = Date.now();

    // Simulate processing delay based on model
    const modelId = this.config.modelId || 'mock-fast';
    const delay = modelId === 'mock-fast' ? 100 + Math.random() * 200 : 300 + Math.random() * 500;

    await new Promise(resolve => setTimeout(resolve, delay));

    const ttfb = Date.now() - startTime;

    // Generate a simple audio blob (sine wave)
    const audioBlob = await this.generateTestAudio(text.length);

    const totalTime = Date.now() - startTime;
    const audioDuration = Math.max(1000, text.length * 50); // ~50ms per character

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
    const startTime = Date.now();
    let ttfb = 0;

    // Simulate streaming with chunks
    const chunkCount = 5;
    const chunkDelay = 100;

    for (let i = 0; i < chunkCount; i++) {
      await new Promise(resolve => setTimeout(resolve, chunkDelay));

      if (ttfb === 0) {
        ttfb = Date.now() - startTime;
      }

      // Generate a small audio chunk
      const chunkData = new ArrayBuffer(1024);

      onChunk({
        data: chunkData,
        timestamp: Date.now(),
        isFinal: i === chunkCount - 1,
      });
    }

    const totalTime = Date.now() - startTime;
    const audioDuration = Math.max(1000, text.length * 50);

    onComplete({
      ttfb,
      totalTime,
      audioDuration,
      characterCount: text.length,
      estimatedCost: this.calculateCost(text.length),
    });
  }

  async sendConversationMessage(
    _input: string | Blob,
    _history: Message[],
    _systemPrompt: string
  ): Promise<{ text: string; audio: Blob; metrics: LatencyMetrics }> {
    const startTime = Date.now();

    // Simulate processing delay
    const delay = 200 + Math.random() * 300;
    await new Promise(resolve => setTimeout(resolve, delay));

    const ttfb = Date.now() - startTime;

    // Generate a random response
    const responseText = SAMPLE_RESPONSES[Math.floor(Math.random() * SAMPLE_RESPONSES.length)];

    // Generate audio for the response
    const audioBlob = await this.generateTestAudio(responseText.length);

    const totalTime = Date.now() - startTime;
    const audioDuration = Math.max(1000, responseText.length * 50);

    const metrics: LatencyMetrics = {
      ttfb,
      totalTime,
      audioDuration,
      characterCount: responseText.length,
      estimatedCost: this.calculateCost(responseText.length),
    };

    return { text: responseText, audio: audioBlob, metrics };
  }

  private async generateTestAudio(length: number): Promise<Blob> {
    // Generate a simple sine wave audio
    const sampleRate = 24000;
    const duration = Math.max(1, length * 0.05); // ~50ms per character
    const numSamples = Math.floor(sampleRate * duration);

    const audioBuffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(audioBuffer);

    // WAV header
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, numSamples * 2, true);

    // Generate sine wave
    const frequency = 440; // A4 note
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      // Add some variation to make it more interesting
      const sample = Math.sin(2 * Math.PI * frequency * t) *
                     Math.sin(Math.PI * i / numSamples) * // Envelope
                     0.3 * 32767;
      view.setInt16(44 + i * 2, sample, true);
    }

    return new Blob([audioBuffer], { type: 'audio/wav' });
  }

  // Use browser's speech synthesis for playback if available
  async speakWithBrowser(text: string): Promise<void> {
    if (!this.speechSynthesis) {
      return;
    }

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);

      // Try to use a specific voice if configured
      const voiceIndex = parseInt(this.config.voiceId?.replace('browser-', '') || '0');
      if (this.availableVoices[voiceIndex]) {
        utterance.voice = this.availableVoices[voiceIndex];
      }

      utterance.onend = () => resolve();
      utterance.onerror = (e) => reject(new Error(e.error));

      this.speechSynthesis?.speak(utterance);
    });
  }

  protected override calculateCost(_characterCount: number): number {
    return 0; // Mock provider is free
  }
}

import type {
  VoiceAgentProvider,
  ProviderId,
  ProviderInfo,
  ProviderConfig,
  Voice,
  Model,
  AudioChunk,
  LatencyMetrics,
  Message,
} from '../types';

export abstract class BaseProvider implements VoiceAgentProvider {
  abstract id: ProviderId;
  abstract name: string;
  abstract info: ProviderInfo;

  protected config: Partial<ProviderConfig> = {};
  protected connected = false;
  protected errorCallback?: (error: Error) => void;

  configure(config: Partial<ProviderConfig>): void {
    this.config = { ...this.config, ...config };
  }

  abstract getVoices(): Promise<Voice[]>;
  abstract getModels(): Promise<Model[]>;

  abstract connect(): Promise<void>;

  disconnect(): void {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  abstract synthesize(text: string): Promise<{
    audio: Blob;
    metrics: LatencyMetrics;
  }>;

  abstract synthesizeStream(
    text: string,
    onChunk: (chunk: AudioChunk) => void,
    onComplete: (metrics: LatencyMetrics) => void
  ): Promise<void>;

  sendConversationMessage?(
    input: string | Blob,
    history: Message[],
    systemPrompt: string
  ): Promise<{
    text: string;
    audio: Blob;
    metrics: LatencyMetrics;
  }>;

  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }

  protected emitError(error: Error): void {
    if (this.errorCallback) {
      this.errorCallback(error);
    }
  }

  protected calculateCost(_characterCount: number): number {
    // Override in subclasses with provider-specific pricing
    return 0;
  }
}

// Voice Agent Provider Types

export type ProviderId = 'openai' | 'elevenlabs' | 'deepgram' | 'cartesia' | 'playht' | 'google';

export interface Voice {
  id: string;
  name: string;
  gender?: 'male' | 'female' | 'neutral';
  language?: string;
  accent?: string;
  preview_url?: string;
}

export interface Model {
  id: string;
  name: string;
  description?: string;
  latency?: 'low' | 'medium' | 'high';
}

export interface ProviderConfig {
  apiKey: string;
  voiceId: string;
  modelId: string;
  [key: string]: unknown;
}

export interface LatencyMetrics {
  ttfb: number; // Time to first byte (ms)
  totalTime: number; // Total response time (ms)
  audioDuration: number; // Duration of audio (ms)
  characterCount: number;
  estimatedCost?: number;
}

export interface AudioChunk {
  data: ArrayBuffer;
  timestamp: number;
  isFinal: boolean;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  audioUrl?: string;
  audioBlob?: Blob;
  timestamp: number;
  metrics?: LatencyMetrics;
  rating?: number;
}

export interface AgentSlot {
  id: string;
  name: string;
  providerId: ProviderId;
  voiceId: string;
  voiceName: string;
  modelId: string;
  modelName: string;
  config: Partial<ProviderConfig>;
  conversationHistory: Message[];
  status: AgentStatus;
  color: string;
}

export type AgentStatus = 'idle' | 'ready' | 'processing' | 'speaking' | 'complete' | 'error';

export interface Turn {
  id: string;
  userInput: {
    text: string;
    audioUrl?: string;
    audioBlob?: Blob;
  };
  responses: Map<string, Message>;
  timestamp: number;
}

export interface Session {
  id: string;
  systemPrompt: string;
  agents: AgentSlot[];
  turns: Turn[];
  createdAt: number;
  updatedAt: number;
}

export interface ProviderInfo {
  id: ProviderId;
  name: string;
  description: string;
  color: string;
  icon?: string;
  supportsStreaming: boolean;
  supportsConversation: boolean;
  defaultVoices: Voice[];
  defaultModels: Model[];
}

// Provider interface that all adapters must implement
export interface VoiceAgentProvider {
  id: ProviderId;
  name: string;
  info: ProviderInfo;

  // Configuration
  configure(config: Partial<ProviderConfig>): void;
  getVoices(): Promise<Voice[]>;
  getModels(): Promise<Model[]>;

  // Connection
  connect(): Promise<void>;
  disconnect(): void;
  isConnected(): boolean;

  // Core functionality - for TTS-only providers
  synthesize(text: string): Promise<{
    audio: Blob;
    metrics: LatencyMetrics;
  }>;

  // Streaming synthesis
  synthesizeStream(
    text: string,
    onChunk: (chunk: AudioChunk) => void,
    onComplete: (metrics: LatencyMetrics) => void
  ): Promise<void>;

  // For full conversational providers (like OpenAI Realtime)
  sendConversationMessage?(
    input: string | Blob,
    history: Message[],
    systemPrompt: string
  ): Promise<{
    text: string;
    audio: Blob;
    metrics: LatencyMetrics;
  }>;

  // Events
  onError(callback: (error: Error) => void): void;
}

export type AgentType = 'openai-v2v' | 'openai-stt' | 'elevenlabs';

export type AgentStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export type SessionMode = 'single' | 'dual';

export interface AgentInfo {
  type: AgentType;
  name: string;
  description: string;
  voice: string;
  icon: string;
}

export interface SessionState {
  id: string;
  mode: SessionMode;
  activeAgents: AgentType[];
  primaryAgent: AgentType;
  agentStatuses: Record<AgentType, AgentStatus>;
  sampleRate: number; // Required audio sample rate for current primary agent
}

export interface TranscriptItem {
  id: string;
  role: 'user' | 'assistant';
  agent?: AgentType;
  text: string;
  timestamp: Date;
}

// WebSocket Messages
export interface StatusMessage {
  type: 'status';
  session: SessionState;
}

export interface TranscriptMessage {
  type: 'transcript';
  role: 'user' | 'assistant';
  agent?: AgentType;
  text: string;
  isFinal: boolean;
}

export interface ErrorMessage {
  type: 'error';
  code: string;
  message: string;
  agent?: AgentType;
}

export type ServerMessage = StatusMessage | TranscriptMessage | ErrorMessage;

/**
 * Base Agent interface and abstract class for voice chat agents
 */

import type { AgentType } from '../types/index.js';

export interface AgentEvents {
  onAudioResponse: (audio: ArrayBuffer) => void;
  onTranscript: (role: 'user' | 'assistant', text: string, isFinal: boolean) => void;
  onStatusChange: (status: 'disconnected' | 'connecting' | 'connected' | 'error') => void;
  onError: (error: string) => void;
}

export interface AgentConfig {
  voice?: string;
  instructions?: string;
}

export abstract class BaseAgent {
  protected type: AgentType;
  protected events: AgentEvents;
  protected config: AgentConfig;
  protected status: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';

  constructor(type: AgentType, events: AgentEvents, config: AgentConfig = {}) {
    this.type = type;
    this.events = events;
    this.config = config;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): void;
  abstract sendAudio(audio: ArrayBuffer): void;

  getType(): AgentType {
    return this.type;
  }

  getStatus(): 'disconnected' | 'connecting' | 'connected' | 'error' {
    return this.status;
  }

  protected setStatus(status: 'disconnected' | 'connecting' | 'connected' | 'error'): void {
    this.status = status;
    this.events.onStatusChange(status);
  }

  /**
   * Get the required audio sample rate for this agent type
   */
  static getSampleRate(_agentType: AgentType): number {
    // Default to 24kHz (OpenAI's requirement)
    return 24000;
  }
}

/**
 * Get the required sample rate for a specific agent type
 */
export function getAgentSampleRate(agentType: AgentType): number {
  switch (agentType) {
    case 'elevenlabs':
      return 16000; // ElevenLabs requires 16kHz
    case 'openai-v2v':
    case 'openai-stt':
    default:
      return 24000; // OpenAI requires 24kHz
  }
}


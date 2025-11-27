export { BaseProvider } from './BaseProvider';
export { OpenAIProvider } from './OpenAIProvider';
export { ElevenLabsProvider } from './ElevenLabsProvider';
export { DeepgramProvider } from './DeepgramProvider';
export { CartesiaProvider } from './CartesiaProvider';
export { MockProvider } from './MockProvider';

import type { VoiceAgentProvider, ProviderId, ProviderInfo } from '../types';
import { OpenAIProvider } from './OpenAIProvider';
import { ElevenLabsProvider } from './ElevenLabsProvider';
import { DeepgramProvider } from './DeepgramProvider';
import { CartesiaProvider } from './CartesiaProvider';
import { MockProvider } from './MockProvider';

// Provider registry
export const PROVIDER_INFO: Record<ProviderId, ProviderInfo> = {
  openai: new OpenAIProvider().info,
  elevenlabs: new ElevenLabsProvider().info,
  deepgram: new DeepgramProvider().info,
  cartesia: new CartesiaProvider().info,
  playht: {
    id: 'playht',
    name: 'PlayHT',
    description: 'Multi-protocol TTS with dialogue generation',
    color: '#ec4899',
    supportsStreaming: true,
    supportsConversation: false,
    defaultVoices: [],
    defaultModels: [],
  },
  google: {
    id: 'google',
    name: 'Google Cloud TTS',
    description: 'Wide language support with WaveNet/Neural2 voices',
    color: '#4285f4',
    supportsStreaming: false,
    supportsConversation: false,
    defaultVoices: [],
    defaultModels: [],
  },
};

export function createProvider(providerId: ProviderId, useMock = false): VoiceAgentProvider {
  if (useMock) {
    const info = PROVIDER_INFO[providerId];
    return new MockProvider(providerId, info.name, info.color);
  }

  switch (providerId) {
    case 'openai':
      return new OpenAIProvider();
    case 'elevenlabs':
      return new ElevenLabsProvider();
    case 'deepgram':
      return new DeepgramProvider();
    case 'cartesia':
      return new CartesiaProvider();
    case 'playht':
    case 'google':
      // Not implemented yet, return mock
      return new MockProvider(providerId, PROVIDER_INFO[providerId].name, PROVIDER_INFO[providerId].color);
    default:
      throw new Error(`Unknown provider: ${providerId}`);
  }
}

// Helper to check if API key is configured
export function hasApiKey(providerId: ProviderId): boolean {
  const key = localStorage.getItem(`${providerId}_api_key`);
  return !!key && key.length > 0;
}

// Helper to get stored API key
export function getApiKey(providerId: ProviderId): string | null {
  return localStorage.getItem(`${providerId}_api_key`);
}

// Helper to save API key
export function saveApiKey(providerId: ProviderId, apiKey: string): void {
  localStorage.setItem(`${providerId}_api_key`, apiKey);
}

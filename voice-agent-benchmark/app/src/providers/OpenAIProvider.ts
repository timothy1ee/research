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
    console.log('[OpenAI] Starting connection...');
    console.log('[OpenAI] API Key present:', !!this.config.apiKey);
    console.log('[OpenAI] API Key length:', this.config.apiKey?.length || 0);

    if (!this.config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    const model = this.config.modelId || 'gpt-4o-realtime-preview';
    console.log('[OpenAI] Model:', model);
    console.log('[OpenAI] Voice:', this.config.voiceId || 'alloy');

    // Note: Browser WebSockets cannot send Authorization headers.
    // OpenAI Realtime API requires authentication which browsers can't provide directly.
    // In production, you would need to:
    // 1. Use an ephemeral token from your backend
    // 2. Set up a WebSocket proxy server
    // 3. Use WebRTC instead of WebSocket

    // Try to connect with API key as query parameter (may not work without proxy)
    const url = `wss://api.openai.com/v1/realtime?model=${model}`;
    console.log('[OpenAI] WebSocket URL:', url);

    return new Promise((resolve, reject) => {
      // Set a connection timeout
      const connectionTimeout = setTimeout(() => {
        console.log('[OpenAI] Connection timeout after 5 seconds');
        console.log('[OpenAI] WebSocket readyState:', this.ws?.readyState);
        console.log('[OpenAI] WebSocket states: 0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED');
        if (this.ws) {
          this.ws.close();
          this.ws = null;
        }
        reject(new Error(
          'OpenAI WebSocket connection timeout. Browser WebSocket connections cannot send Authorization headers. ' +
          'For browser use, you need either: (1) a backend proxy server, (2) ephemeral tokens, or (3) use Mock mode for testing.'
        ));
      }, 5000);

      try {
        console.log('[OpenAI] Creating WebSocket...');
        this.ws = new WebSocket(url);
        console.log('[OpenAI] WebSocket created, readyState:', this.ws.readyState);
      } catch (err) {
        console.error('[OpenAI] WebSocket creation failed:', err);
        clearTimeout(connectionTimeout);
        reject(new Error(
          'Failed to create WebSocket connection to OpenAI. ' +
          'Browser WebSocket connections cannot authenticate directly. Use Mock mode for testing.'
        ));
        return;
      }

      this.ws.onopen = () => {
        console.log('[OpenAI] WebSocket opened successfully!');
        clearTimeout(connectionTimeout);

        const sessionConfig = {
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
        };
        console.log('[OpenAI] Sending session config:', sessionConfig);
        this.ws?.send(JSON.stringify(sessionConfig));
        this.connected = true;
        resolve();
      };

      this.ws.onerror = (event) => {
        console.error('[OpenAI] WebSocket error event:', event);
        console.error('[OpenAI] WebSocket readyState at error:', this.ws?.readyState);
        clearTimeout(connectionTimeout);
        this.emitError(new Error(
          'OpenAI WebSocket connection failed. This is likely due to browser authentication limitations. ' +
          'Use Mock mode for testing, or set up a backend proxy for live mode.'
        ));
        reject(new Error('WebSocket connection failed - authentication not supported in browser'));
      };

      this.ws.onmessage = (event) => {
        console.log('[OpenAI] Message received:', event.data.substring(0, 200) + '...');
        try {
          const message = JSON.parse(event.data);
          console.log('[OpenAI] Parsed message type:', message.type);
          this.handleMessage(message);
        } catch (err) {
          console.error('[OpenAI] Error parsing WebSocket message:', err);
        }
      };

      this.ws.onclose = (event) => {
        console.log('[OpenAI] WebSocket closed');
        console.log('[OpenAI] Close code:', event.code);
        console.log('[OpenAI] Close reason:', event.reason || '(no reason provided)');
        console.log('[OpenAI] Was clean close:', event.wasClean);
        clearTimeout(connectionTimeout);
        this.connected = false;
        if (!event.wasClean) {
          console.warn('[OpenAI] WebSocket closed unexpectedly');
        }
      };
    });
  }

  private handleMessage(message: { type: string; [key: string]: unknown }): void {
    console.log('[OpenAI] handleMessage:', message.type);

    switch (message.type) {
      case 'session.created':
        console.log('[OpenAI] Session created:', message);
        break;

      case 'session.updated':
        console.log('[OpenAI] Session updated:', message);
        break;

      case 'conversation.item.created':
        console.log('[OpenAI] Conversation item created:', message);
        break;

      case 'response.created':
        console.log('[OpenAI] Response created');
        break;

      case 'response.output_item.added':
        console.log('[OpenAI] Output item added');
        break;

      case 'response.content_part.added':
        console.log('[OpenAI] Content part added');
        break;

      case 'response.audio.delta':
        if (this.ttfb === 0) {
          this.ttfb = Date.now() - this.startTime;
          console.log('[OpenAI] First audio byte received, TTFB:', this.ttfb, 'ms');
        }
        const audioData = message.delta as string;
        const binaryData = Uint8Array.from(atob(audioData), c => c.charCodeAt(0));
        this.audioChunks.push(binaryData.buffer);
        console.log('[OpenAI] Audio chunk received, total chunks:', this.audioChunks.length);
        break;

      case 'response.audio_transcript.delta':
        this.responseText += message.delta as string;
        console.log('[OpenAI] Transcript delta, current text:', this.responseText.substring(0, 50) + '...');
        break;

      case 'response.audio.done':
        console.log('[OpenAI] Audio stream complete');
        break;

      case 'response.audio_transcript.done':
        console.log('[OpenAI] Transcript complete:', this.responseText);
        break;

      case 'response.content_part.done':
        console.log('[OpenAI] Content part done');
        break;

      case 'response.output_item.done':
        console.log('[OpenAI] Output item done');
        break;

      case 'response.done':
        console.log('[OpenAI] Response complete, finalizing...');
        this.finalizeResponse();
        break;

      case 'error':
        const errorObj = message.error as { message?: string; type?: string; code?: string };
        console.error('[OpenAI] Error received:', errorObj);
        this.emitError(new Error(errorObj?.message || 'Unknown error'));
        break;

      default:
        console.log('[OpenAI] Unhandled message type:', message.type, message);
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
    console.log('[OpenAI] sendConversationMessage called');
    console.log('[OpenAI] Input type:', typeof input === 'string' ? 'text' : 'blob');
    console.log('[OpenAI] Input:', typeof input === 'string' ? input : `Blob(${input.size} bytes)`);
    console.log('[OpenAI] System prompt:', systemPrompt?.substring(0, 100) + '...');
    console.log('[OpenAI] WebSocket state:', this.ws?.readyState);

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('[OpenAI] WebSocket not connected! State:', this.ws?.readyState);
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
        const sessionUpdate = {
          type: 'session.update',
          session: {
            instructions: systemPrompt,
          },
        };
        console.log('[OpenAI] Sending session update with instructions');
        this.ws?.send(JSON.stringify(sessionUpdate));
      }

      // Send the message
      if (typeof input === 'string') {
        const conversationItem = {
          type: 'conversation.item.create',
          item: {
            type: 'message',
            role: 'user',
            content: [{ type: 'input_text', text: input }],
          },
        };
        console.log('[OpenAI] Sending conversation item:', conversationItem);
        this.ws?.send(JSON.stringify(conversationItem));
      } else {
        // Handle audio input - convert blob to base64
        console.log('[OpenAI] Converting audio blob to base64...');
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          console.log('[OpenAI] Sending audio buffer, base64 length:', base64.length);
          this.ws?.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: base64,
          }));
          this.ws?.send(JSON.stringify({
            type: 'input_audio_buffer.commit',
          }));
          console.log('[OpenAI] Audio buffer committed');
        };
        reader.readAsDataURL(input);
      }

      // Request response
      console.log('[OpenAI] Sending response.create request');
      this.ws?.send(JSON.stringify({
        type: 'response.create',
      }));

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.responseResolver) {
          console.error('[OpenAI] Response timeout after 30 seconds');
          console.error('[OpenAI] Audio chunks received:', this.audioChunks.length);
          console.error('[OpenAI] Response text so far:', this.responseText);
          this.responseResolver = null;
          reject(new Error('Response timeout after 30 seconds'));
        }
      }, 30000);
    });
  }

  protected calculateCost(characterCount: number): number {
    // OpenAI Realtime pricing is complex, approximating
    return (characterCount / 1000) * 0.06;
  }
}

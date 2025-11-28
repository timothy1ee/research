/**
 * ElevenLabs Conversational AI Agent
 * Handles voice conversations using ElevenLabs' Conversational AI API
 * 
 * NOTE: You must create an agent in the ElevenLabs dashboard first:
 * https://elevenlabs.io/agents
 * Then set the ELEVENLABS_AGENT_ID environment variable
 */

import WebSocket from 'ws';
import { BaseAgent, AgentEvents, AgentConfig } from './BaseAgent.js';
import { logger } from '../utils/logger.js';

interface ElevenLabsConfig extends AgentConfig {
  agentId?: string;
  voiceId?: string;
}

interface ElevenLabsMessage {
  type: string;
  [key: string]: unknown;
}

export class ElevenLabsAgent extends BaseAgent {
  private ws: WebSocket | null = null;
  private apiKey: string;
  private agentId: string;
  private elevenConfig: ElevenLabsConfig;

  constructor(events: AgentEvents, config: ElevenLabsConfig = {}) {
    super('elevenlabs', events, config);
    this.apiKey = process.env.ELEVENLABS_API_KEY || '';
    this.agentId = process.env.ELEVENLABS_AGENT_ID || config.agentId || '';
    this.elevenConfig = {
      voiceId: config.voiceId || 'EXAVITQu4vr4xnSDxMaL', // Default: Rachel
      instructions: config.instructions || 'You are a helpful, friendly assistant. Keep responses concise and conversational.',
      ...config,
    };

    if (!this.apiKey) {
      logger.error('ELEVENLABS', 'No ElevenLabs API key found in environment');
    }
    if (!this.agentId) {
      logger.error('ELEVENLABS', 'No ElevenLabs Agent ID found. Create an agent at https://elevenlabs.io/agents and set ELEVENLABS_AGENT_ID');
    }
  }

  async connect(): Promise<void> {
    if (this.status === 'connected' || this.status === 'connecting') {
      logger.warn('ELEVENLABS', 'Already connected or connecting');
      return;
    }

    if (!this.agentId) {
      const error = 'No agent ID configured. Create an agent at https://elevenlabs.io/agents and set ELEVENLABS_AGENT_ID';
      logger.error('ELEVENLABS', error);
      this.setStatus('error');
      this.events.onError(error);
      return;
    }

    this.setStatus('connecting');

    try {
      // Get a signed URL for the WebSocket connection
      const signedUrl = await this.getSignedUrl();
      
      if (!signedUrl) {
        throw new Error('Failed to get signed URL');
      }

      // Connect to the conversation WebSocket
      await this.connectWebSocket(signedUrl);
    } catch (error) {
      logger.error('ELEVENLABS', 'Failed to connect', { error: String(error) });
      this.setStatus('error');
      this.events.onError(`ElevenLabs connection error: ${error}`);
      throw error;
    }
  }

  private async getSignedUrl(): Promise<string | null> {
    logger.info('ELEVENLABS', 'Getting signed URL for agent', { agentId: this.agentId });

    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${this.agentId}`,
        {
          method: 'GET',
          headers: {
            'xi-api-key': this.apiKey,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('ELEVENLABS', 'Failed to get signed URL', { status: response.status, error: errorText });
        return null;
      }

      const data = await response.json() as { signed_url: string };
      logger.info('ELEVENLABS', 'Got signed URL');
      return data.signed_url;
    } catch (error) {
      logger.error('ELEVENLABS', 'Error getting signed URL', { error: String(error) });
      return null;
    }
  }

  private async connectWebSocket(signedUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      logger.info('ELEVENLABS', 'Connecting to WebSocket');

      this.ws = new WebSocket(signedUrl);

      const connectionTimeout = setTimeout(() => {
        if (this.status === 'connecting') {
          this.ws?.close();
          reject(new Error('Connection timeout'));
        }
      }, 10000);

      this.ws.on('open', () => {
        clearTimeout(connectionTimeout);
        logger.info('ELEVENLABS', 'WebSocket connected');
        this.setStatus('connected');
        
        // Initialize the conversation
        this.sendInitMessage();
        resolve();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        this.handleMessage(data);
      });

      this.ws.on('close', (code, reason) => {
        clearTimeout(connectionTimeout);
        logger.info('ELEVENLABS', 'WebSocket closed', { code, reason: reason.toString() });
        this.setStatus('disconnected');
        this.ws = null;
      });

      this.ws.on('error', (error) => {
        clearTimeout(connectionTimeout);
        logger.error('ELEVENLABS', 'WebSocket error', { error: error.message });
        this.setStatus('error');
        this.events.onError(`ElevenLabs WebSocket error: ${error.message}`);
        reject(error);
      });
    });
  }

  private sendInitMessage(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // Send initialization message (simple format per docs)
    const initMessage = {
      type: 'conversation_initiation_client_data',
    };

    this.ws.send(JSON.stringify(initMessage));
    logger.info('ELEVENLABS', 'Sent init message');
  }

  disconnect(): void {
    if (this.ws) {
      logger.info('ELEVENLABS', 'Disconnecting');
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  sendAudio(audio: ArrayBuffer): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.warn('ELEVENLABS', 'Cannot send audio - not connected');
      return;
    }

    // Audio should already be at 16kHz PCM from frontend
    // Convert ArrayBuffer to Uint8Array for proper byte handling
    const uint8Array = new Uint8Array(audio);
    
    // Use Buffer.from with Uint8Array for base64 encoding
    const base64Audio = Buffer.from(uint8Array).toString('base64');

    // Log audio stats for debugging (using INFO to ensure visibility)
    const int16View = new Int16Array(audio);
    let maxVal = 0;
    for (let i = 0; i < int16View.length; i++) {
      const absVal = Math.abs(int16View[i]);
      if (absVal > maxVal) maxVal = absVal;
    }
    logger.info('ELEVENLABS', 'Sending audio chunk', { 
      bytes: uint8Array.length,
      samples: int16View.length,
      maxAmplitude: maxVal,
      base64Length: base64Audio.length,
      firstBytes: Array.from(uint8Array.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(' '),
    });

    // Send audio to ElevenLabs - try with type field as per API reference
    this.ws.send(JSON.stringify({
      type: 'user_audio_chunk',
      user_audio_chunk: base64Audio,
    }));
  }

  /**
   * Get the required sample rate for this agent
   */
  static getSampleRate(): number {
    return 16000; // ElevenLabs requires 16kHz
  }

  private handleMessage(data: WebSocket.Data): void {
    // Convert to string for JSON parsing attempt
    let dataStr: string;
    let dataBuffer: Buffer;
    
    if (data instanceof Buffer) {
      dataBuffer = data;
      dataStr = data.toString('utf8');
    } else if (data instanceof ArrayBuffer) {
      dataBuffer = Buffer.from(data);
      dataStr = dataBuffer.toString('utf8');
    } else {
      dataStr = String(data);
      dataBuffer = Buffer.from(dataStr);
    }

    // Try to parse as JSON first
    try {
      const message = JSON.parse(dataStr) as ElevenLabsMessage;
      this.handleJsonMessage(message);
    } catch {
      // Not JSON - treat as raw binary audio (unlikely with ElevenLabs, but handle it)
      logger.warn('ELEVENLABS', 'Received non-JSON data', { size: dataBuffer.length });
    }
  }

  private handleJsonMessage(message: ElevenLabsMessage): void {
    logger.info('ELEVENLABS', 'Event received', { type: message.type });
    
    switch (message.type) {
      case 'conversation_initiation_metadata':
        // Log full metadata to see expected audio formats
        logger.info('ELEVENLABS', 'Conversation initialized', { 
          conversationId: message.conversation_id,
          fullMessage: JSON.stringify(message).slice(0, 500)
        });
        break;

      case 'audio':
        // Audio response - nested in audio_event.audio_base_64
        const audioEvent = message.audio_event as { audio_base_64?: string };
        if (audioEvent?.audio_base_64) {
          const audioBuffer = Buffer.from(audioEvent.audio_base_64, 'base64');
          logger.debug('ELEVENLABS', 'Sending audio chunk', { size: audioBuffer.length });
          this.events.onAudioResponse(audioBuffer.buffer.slice(
            audioBuffer.byteOffset,
            audioBuffer.byteOffset + audioBuffer.byteLength
          ));
        }
        break;

      case 'agent_response':
        // Agent's text response - nested in agent_response_event.agent_response
        const agentEvent = message.agent_response_event as { agent_response?: string };
        if (agentEvent?.agent_response) {
          logger.info('ELEVENLABS', 'Agent response', { text: agentEvent.agent_response });
          this.events.onTranscript('assistant', agentEvent.agent_response, true);
        }
        break;

      case 'agent_response_correction':
        // Corrected response - use the corrected version
        const correctionEvent = message.agent_response_correction_event as { corrected_agent_response?: string };
        if (correctionEvent?.corrected_agent_response) {
          logger.info('ELEVENLABS', 'Agent response corrected', { text: correctionEvent.corrected_agent_response });
          this.events.onTranscript('assistant', correctionEvent.corrected_agent_response, true);
        }
        break;

      case 'user_transcript':
        // User's speech transcription - nested in user_transcription_event.user_transcript
        const userEvent = message.user_transcription_event as { user_transcript?: string };
        if (userEvent?.user_transcript) {
          logger.info('ELEVENLABS', 'User transcript', { text: userEvent.user_transcript });
          this.events.onTranscript('user', userEvent.user_transcript, true);
        }
        break;

      case 'interruption':
        logger.debug('ELEVENLABS', 'User interrupted');
        break;

      case 'ping':
        // Respond to ping with pong (include event_id and handle ping_ms delay)
        const pingEvent = message.ping_event as { event_id?: number; ping_ms?: number };
        if (this.ws?.readyState === WebSocket.OPEN && pingEvent) {
          const delay = pingEvent.ping_ms || 0;
          setTimeout(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
              this.ws.send(JSON.stringify({ 
                type: 'pong', 
                event_id: pingEvent.event_id 
              }));
            }
          }, delay);
        }
        break;

      case 'error':
        const errorMsg = message.message as string || 'Unknown error';
        logger.error('ELEVENLABS', 'API error', { error: errorMsg });
        this.events.onError(errorMsg);
        break;

      default:
        logger.debug('ELEVENLABS', 'Unhandled message type', { type: message.type, data: JSON.stringify(message).slice(0, 200) });
    }
  }
}


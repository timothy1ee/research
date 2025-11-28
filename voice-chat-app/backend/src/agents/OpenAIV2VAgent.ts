/**
 * OpenAI Voice-to-Voice Agent using the Realtime API
 * Handles bidirectional audio streaming with OpenAI's GPT-4 Realtime model
 */

import WebSocket from 'ws';
import { BaseAgent, AgentEvents, AgentConfig } from './BaseAgent.js';
import { logger } from '../utils/logger.js';

// GA API URL (no longer using preview model)
const OPENAI_REALTIME_URL = 'wss://api.openai.com/v1/realtime?model=gpt-realtime';

interface OpenAIConfig extends AgentConfig {
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  turnDetection?: 'server_vad' | 'none';
}

interface RealtimeEvent {
  type: string;
  event_id?: string;
  [key: string]: unknown;
}

interface SessionUpdateEvent {
  type: 'session.update';
  session: {
    type: 'realtime';  // Required for GA API
    model?: string;
    instructions?: string;
    output_modalities?: string[];
    audio?: {
      input?: {
        format?: {
          type: string;
          rate?: number;
        };
        turn_detection?: {
          type: string;
        } | null;
        transcription?: {
          model: string;
        };
      };
      output?: {
        format?: {
          type: string;
          rate?: number;
        };
        voice?: string;
      };
    };
  };
}

export class OpenAIV2VAgent extends BaseAgent {
  private ws: WebSocket | null = null;
  private apiKey: string;
  private openaiConfig: OpenAIConfig;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  constructor(events: AgentEvents, config: OpenAIConfig = {}) {
    super('openai-v2v', events, config);
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.openaiConfig = {
      voice: config.voice || 'alloy',
      turnDetection: config.turnDetection || 'server_vad',
      instructions: config.instructions || 'You are a helpful, friendly assistant. Keep responses concise and conversational.',
    };

    if (!this.apiKey) {
      logger.error('OPENAI_V2V', 'No OpenAI API key found in environment');
    }
  }

  async connect(): Promise<void> {
    if (this.status === 'connected' || this.status === 'connecting') {
      logger.warn('OPENAI_V2V', 'Already connected or connecting');
      return;
    }

    this.setStatus('connecting');
    logger.info('OPENAI_V2V', 'Connecting to OpenAI Realtime API');

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(OPENAI_REALTIME_URL, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            // Note: OpenAI-Beta header removed for GA API
          },
        });

        this.ws.on('open', () => {
          logger.info('OPENAI_V2V', 'Connected to OpenAI Realtime API');
          this.setStatus('connected');
          this.reconnectAttempts = 0;
          this.configureSession();
          resolve();
        });

        this.ws.on('message', (data: WebSocket.Data) => {
          this.handleMessage(data);
        });

        this.ws.on('close', (code, reason) => {
          logger.info('OPENAI_V2V', 'Disconnected from OpenAI', { code, reason: reason.toString() });
          this.setStatus('disconnected');
          this.ws = null;
        });

        this.ws.on('error', (error) => {
          logger.error('OPENAI_V2V', 'WebSocket error', { error: error.message });
          this.setStatus('error');
          this.events.onError(`OpenAI connection error: ${error.message}`);
          reject(error);
        });
      } catch (error) {
        logger.error('OPENAI_V2V', 'Failed to connect', { error: String(error) });
        this.setStatus('error');
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.ws) {
      logger.info('OPENAI_V2V', 'Disconnecting from OpenAI');
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  sendAudio(audio: ArrayBuffer): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.warn('OPENAI_V2V', 'Cannot send audio - not connected');
      return;
    }

    // Convert ArrayBuffer to base64
    const base64Audio = Buffer.from(audio).toString('base64');
    logger.info('OPENAI_V2V', 'Sending audio to OpenAI', { 
      size: audio.byteLength, 
      base64Length: base64Audio.length 
    });

    // Send audio to OpenAI
    const event = {
      type: 'input_audio_buffer.append',
      audio: base64Audio,
    };

    this.ws.send(JSON.stringify(event));
  }

  /**
   * Commit the audio buffer and request a response.
   * Call this when the user stops speaking (releases mic button).
   */
  commitAndRespond(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.warn('OPENAI_V2V', 'Cannot commit - not connected');
      return;
    }

    logger.info('OPENAI_V2V', 'Committing audio buffer and requesting response');

    // Commit the audio buffer
    this.ws.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));

    // Request a response
    this.ws.send(JSON.stringify({ type: 'response.create' }));
  }

  private configureSession(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    // GA API session config for push-to-talk (VAD disabled)
    const sessionUpdate: SessionUpdateEvent = {
      type: 'session.update',
      session: {
        type: 'realtime',
        model: 'gpt-realtime',
        instructions: this.openaiConfig.instructions,
        output_modalities: ['audio'],
        audio: {
          input: {
            format: {
              type: 'audio/pcm',
              rate: 24000,
            },
            // Disable VAD for push-to-talk - we manually commit and trigger responses
            turn_detection: null,
            // Enable input audio transcription so we can show user's speech
            transcription: {
              model: 'gpt-4o-transcribe',
            },
          },
          output: {
            format: {
              type: 'audio/pcm',
              rate: 24000,
            },
            voice: this.openaiConfig.voice,
          },
        },
      },
    };

    logger.info('OPENAI_V2V', 'Configuring session', { voice: this.openaiConfig.voice });
    this.ws.send(JSON.stringify(sessionUpdate));
  }

  private handleMessage(data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString()) as RealtimeEvent;
      
      // Log ALL events from OpenAI
      logger.info('OPENAI_V2V', 'Event received', { type: message.type });
      
      switch (message.type) {
        case 'session.created':
          logger.info('OPENAI_V2V', 'Session created');
          break;

        case 'session.updated':
          logger.info('OPENAI_V2V', 'Session updated');
          break;

        case 'input_audio_buffer.speech_started':
          logger.debug('OPENAI_V2V', 'Speech started');
          break;

        case 'input_audio_buffer.speech_stopped':
          logger.debug('OPENAI_V2V', 'Speech stopped');
          break;

        case 'input_audio_buffer.committed':
          logger.info('OPENAI_V2V', 'Audio buffer committed', { 
            details: JSON.stringify(message).slice(0, 500) 
          });
          break;

        case 'conversation.item.added':
          logger.info('OPENAI_V2V', 'Conversation item added', {
            details: JSON.stringify(message).slice(0, 500)
          });
          break;

        case 'conversation.item.input_audio_transcription.completed':
          // User's speech transcription
          const userTranscript = (message as { transcript?: string }).transcript || '';
          if (userTranscript) {
            logger.info('OPENAI_V2V', 'User transcript', { text: userTranscript });
            this.events.onTranscript('user', userTranscript, true);
          }
          break;

        // GA API event names (response.output_* instead of response.*)
        case 'response.output_audio_transcript.delta':
          // Streaming assistant transcript
          const deltaText = (message as { delta?: string }).delta || '';
          if (deltaText) {
            this.events.onTranscript('assistant', deltaText, false);
          }
          break;

        case 'response.output_audio_transcript.done':
          // Final assistant transcript
          const finalTranscript = (message as { transcript?: string }).transcript || '';
          if (finalTranscript) {
            logger.info('OPENAI_V2V', 'Assistant transcript', { text: finalTranscript });
            this.events.onTranscript('assistant', finalTranscript, true);
          }
          break;

        case 'response.output_audio.delta':
          // Audio response chunk
          const audioBase64 = (message as { delta?: string }).delta;
          if (audioBase64) {
            const audioBuffer = Buffer.from(audioBase64, 'base64');
            logger.debug('OPENAI_V2V', 'Sending audio chunk to client', { size: audioBuffer.length });
            this.events.onAudioResponse(audioBuffer.buffer.slice(
              audioBuffer.byteOffset,
              audioBuffer.byteOffset + audioBuffer.byteLength
            ));
          }
          break;

        case 'response.output_audio.done':
          logger.debug('OPENAI_V2V', 'Audio response complete');
          break;

        case 'response.done':
          // Log full response to debug why no audio was generated
          logger.info('OPENAI_V2V', 'Response complete', { 
            response: JSON.stringify(message).slice(0, 1000) 
          });
          break;

        case 'error':
          const errorMsg = (message as { error?: { message?: string } }).error?.message || 'Unknown error';
          logger.error('OPENAI_V2V', 'API error', { error: errorMsg });
          this.events.onError(errorMsg);
          break;

        default:
          logger.debug('OPENAI_V2V', 'Unhandled event', { type: message.type });
      }
    } catch (error) {
      logger.error('OPENAI_V2V', 'Failed to parse message', { error: String(error) });
    }
  }
}


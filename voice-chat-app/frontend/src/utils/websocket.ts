/**
 * WebSocket client for communicating with the voice chat backend.
 * Handles both binary audio data and JSON control messages.
 */

import type { AgentType, SessionState, ServerMessage } from '../types';

export interface WebSocketClientOptions {
  url: string;
  onStatusUpdate: (session: SessionState) => void;
  onTranscript: (role: 'user' | 'assistant', text: string, agent?: AgentType, isFinal?: boolean) => void;
  onAudioData: (data: ArrayBuffer, agent: AgentType) => void;
  onError: (error: string, agent?: AgentType) => void;
  onConnect: () => void;
  onDisconnect: () => void;
}

export type ControlAction = 'start' | 'stop' | 'swap' | 'select' | 'toggle-dual' | 'mic-release';

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private options: WebSocketClientOptions;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnected = false;

  constructor(options: WebSocketClientOptions) {
    this.options = options;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[WS] Already connected');
      return;
    }

    if (this.ws?.readyState === WebSocket.CONNECTING) {
      console.log('[WS] Already connecting');
      return;
    }

    console.log('[WS] Connecting to', this.options.url);

    try {
      this.ws = new WebSocket(this.options.url);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        console.log('[WS] Connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.options.onConnect();
      };

      this.ws.onclose = (event) => {
        console.log('[WS] Disconnected', event.code, event.reason);
        this.isConnected = false;
        this.options.onDisconnect();

        // Attempt reconnection
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
          console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
          setTimeout(() => this.connect(), delay);
        }
      };

      this.ws.onerror = (event) => {
        console.error('[WS] Error', event);
        this.options.onError('WebSocket connection error');
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };
    } catch (error) {
      console.error('[WS] Connection failed', error);
      this.options.onError('Failed to connect to server');
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  /**
   * Send audio data as binary
   */
  sendAudio(data: ArrayBuffer): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      // Convert to Uint8Array for sending
      const uint8 = new Uint8Array(data);
      console.log('[WS] Sending audio as Uint8Array, size:', uint8.byteLength, 'first bytes:', Array.from(uint8.slice(0, 4)));
      try {
        this.ws.send(uint8.buffer);
        console.log('[WS] Send completed, bufferedAmount:', this.ws.bufferedAmount);
      } catch (err) {
        console.error('[WS] Send error:', err);
      }
    } else {
      console.warn('[WS] Cannot send audio - WebSocket not open, state:', this.ws?.readyState);
    }
  }

  /**
   * Send control message as JSON
   */
  sendControl(action: ControlAction, payload?: { agent?: AgentType; enabled?: boolean }): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message = {
        type: 'control',
        action,
        payload,
      };
      this.ws.send(JSON.stringify(message));
      console.log('[WS] Sent control', action, payload);
    }
  }

  private handleMessage(data: unknown): void {
    // Debug: log what type of data we receive
    console.log('[WS] Received message type:', typeof data, data instanceof ArrayBuffer ? 'ArrayBuffer' : data instanceof Blob ? 'Blob' : 'other');
    
    if (data instanceof ArrayBuffer) {
      // Binary data - audio response (raw PCM16)
      console.log('[WS] Received audio ArrayBuffer, size:', data.byteLength);
      this.options.onAudioData(data, 'openai-v2v');
    } else if (data instanceof Blob) {
      // Convert Blob to ArrayBuffer
      data.arrayBuffer().then((buffer) => {
        console.log('[WS] Converted Blob to ArrayBuffer, size:', buffer.byteLength);
        this.options.onAudioData(buffer, 'openai-v2v');
      });
    } else if (typeof data === 'string') {
      // JSON message
      try {
        const message = JSON.parse(data) as ServerMessage;
        this.handleServerMessage(message);
      } catch (error) {
        console.error('[WS] Failed to parse message', error);
      }
    } else {
      console.warn('[WS] Unknown message type:', typeof data);
    }
  }

  private handleServerMessage(message: ServerMessage): void {
    switch (message.type) {
      case 'status':
        console.log('[WS] Status update', message.session);
        this.options.onStatusUpdate(message.session);
        break;

      case 'transcript':
        console.log('[WS] Transcript', message.role, message.text);
        this.options.onTranscript(
          message.role,
          message.text,
          message.agent,
          message.isFinal
        );
        break;

      case 'error':
        console.error('[WS] Error', message.code, message.message);
        this.options.onError(message.message, message.agent);
        break;

      default:
        console.warn('[WS] Unknown message type', message);
    }
  }

  get connected(): boolean {
    return this.isConnected;
  }
}


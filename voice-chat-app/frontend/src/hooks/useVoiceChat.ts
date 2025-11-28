/**
 * useVoiceChat - Main hook for managing voice chat state and interactions
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { AudioCapture, AudioPlayback } from '../utils/audio';
import { WebSocketClient } from '../utils/websocket';
import type { AgentType, SessionState, TranscriptItem } from '../types';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3002';

interface UseVoiceChatReturn {
  // State
  session: SessionState;
  transcript: TranscriptItem[];
  dualResponses: Map<AgentType, TranscriptItem>;
  isRecording: boolean;
  isConnected: boolean;
  isPlaying: boolean;
  error: string | null;

  // Actions
  connect: () => void;
  disconnect: () => void;
  startRecording: () => void;
  stopRecording: () => void;
  selectAgent: (agent: AgentType) => void;
  toggleDualMode: () => void;
  clearError: () => void;
  clearDualResponses: () => void;
}

const INITIAL_SESSION: SessionState = {
  id: '',
  mode: 'single',
  activeAgents: ['openai-v2v'],
  primaryAgent: 'openai-v2v',
  agentStatuses: {
    'openai-v2v': 'disconnected',
    'openai-stt': 'disconnected',
    'elevenlabs': 'disconnected',
  },
  sampleRate: 24000, // Default to OpenAI's 24kHz
};

export function useVoiceChat(): UseVoiceChatReturn {
  const [session, setSession] = useState<SessionState>(INITIAL_SESSION);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [dualResponses, setDualResponses] = useState<Map<AgentType, TranscriptItem>>(new Map());
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsClientRef = useRef<WebSocketClient | null>(null);
  const audioCaptureRef = useRef<AudioCapture | null>(null);
  const audioPlaybackRef = useRef<AudioPlayback | null>(null);
  const sessionModeRef = useRef<'single' | 'dual'>('single');
  const pendingUserTranscriptRef = useRef<string | null>(null);

  // Keep session mode ref in sync
  useEffect(() => {
    sessionModeRef.current = session.mode;
  }, [session.mode]);

  // Initialize audio playback
  useEffect(() => {
    audioPlaybackRef.current = new AudioPlayback();
    return () => {
      audioPlaybackRef.current?.stop();
    };
  }, []);

  // WebSocket event handlers
  const handleStatusUpdate = useCallback((newSession: SessionState) => {
    setSession((prevSession) => {
      // If sample rate changed, update playback
      if (newSession.sampleRate && newSession.sampleRate !== prevSession.sampleRate) {
        console.log('[VoiceChat] Sample rate changed:', prevSession.sampleRate, '->', newSession.sampleRate);
        audioPlaybackRef.current?.setSampleRate(newSession.sampleRate);
      }
      return newSession;
    });
  }, []);

  const handleTranscript = useCallback(
    (role: 'user' | 'assistant', text: string, agent?: AgentType, isFinal?: boolean) => {
      if (!isFinal) return;

      if (role === 'user') {
        // Store user transcript to add to history
        pendingUserTranscriptRef.current = text;
        
        // In dual mode, clear previous responses when user speaks
        if (sessionModeRef.current === 'dual') {
          setDualResponses(new Map());
        }

        // Add user message to transcript
        const userItem: TranscriptItem = {
          id: `user-${Date.now()}`,
          role: 'user',
          text,
          timestamp: new Date(),
        };
        setTranscript((prev) => [...prev, userItem]);
      } else if (role === 'assistant' && agent) {
        // In dual mode, collect responses from each agent
        if (sessionModeRef.current === 'dual') {
          setDualResponses((prev) => {
            const next = new Map(prev);
            next.set(agent, {
              id: `${agent}-${Date.now()}`,
              role: 'assistant',
              agent,
              text,
              timestamp: new Date(),
            });
            return next;
          });
        } else {
          // In single mode, add directly to transcript
          const assistantItem: TranscriptItem = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            agent,
            text,
            timestamp: new Date(),
          };
          setTranscript((prev) => [...prev, assistantItem]);
        }
      }
    },
    []
  );

  const handleAudioData = useCallback((data: ArrayBuffer, agent: AgentType) => {
    console.log('[VoiceChat] Received audio data from', agent, 'size:', data.byteLength);
    if (data.byteLength > 0) {
      audioPlaybackRef.current?.play(data);
      setIsPlaying(true);
      
      // Reset playing state after audio likely finishes
      setTimeout(() => setIsPlaying(false), 500);
    } else {
      console.warn('[VoiceChat] Received empty audio data');
    }
  }, []);

  const handleError = useCallback((errorMsg: string, _agent?: AgentType) => {
    setError(errorMsg);
    console.error('[VoiceChat] Error:', errorMsg);
  }, []);

  const handleConnect = useCallback(() => {
    setIsConnected(true);
    setError(null);
    // Send start command to initialize session
    wsClientRef.current?.sendControl('start');
  }, []);

  const handleDisconnect = useCallback(() => {
    setIsConnected(false);
    setIsRecording(false);
  }, []);

  // Connect to WebSocket server
  const connect = useCallback(() => {
    if (wsClientRef.current?.connected) return;

    wsClientRef.current = new WebSocketClient({
      url: WS_URL,
      onStatusUpdate: handleStatusUpdate,
      onTranscript: handleTranscript,
      onAudioData: handleAudioData,
      onError: handleError,
      onConnect: handleConnect,
      onDisconnect: handleDisconnect,
    });

    wsClientRef.current.connect();
  }, [handleStatusUpdate, handleTranscript, handleAudioData, handleError, handleConnect, handleDisconnect]);

  // Disconnect from WebSocket server
  const disconnect = useCallback(() => {
    wsClientRef.current?.sendControl('stop');
    wsClientRef.current?.disconnect();
    audioCaptureRef.current?.stop();
    setIsRecording(false);
  }, []);

  // Start recording audio
  const startRecording = useCallback(() => {
    if (!isConnected) {
      connect();
      setTimeout(() => startRecording(), 500);
      return;
    }

    if (audioCaptureRef.current?.capturing) return;

    // Use the sample rate from the current session (depends on active agent)
    const sampleRate = session.sampleRate || 24000;
    console.log('[VoiceChat] Starting capture at', sampleRate, 'Hz for agent:', session.primaryAgent);

    audioCaptureRef.current = new AudioCapture({
      sampleRate,
      onAudioData: (data) => {
        console.log('[VoiceChat] Audio chunk captured, size:', data.byteLength, 'WS connected:', wsClientRef.current?.connected);
        if (wsClientRef.current?.connected) {
          wsClientRef.current.sendAudio(data);
        } else {
          console.error('[VoiceChat] WebSocket not connected!');
        }
      },
      onError: (err) => {
        console.error('[VoiceChat] Audio capture error:', err.message);
        setError(err.message);
        setIsRecording(false);
      },
    });

    audioCaptureRef.current.start();
    setIsRecording(true);
  }, [isConnected, connect, session.sampleRate, session.primaryAgent]);

  // Stop recording audio
  const stopRecording = useCallback(() => {
    audioCaptureRef.current?.stop();
    setIsRecording(false);
    
    // Tell backend to commit audio and trigger response (push-to-talk flow)
    console.log('[VoiceChat] Mic released - sending mic-release control');
    wsClientRef.current?.sendControl('mic-release');
  }, []);

  // Select/swap agent (also used to choose response in dual mode)
  const selectAgent = useCallback((agent: AgentType) => {
    // If in dual mode and selecting from responses, add to transcript
    if (session.mode === 'dual' && dualResponses.has(agent)) {
      const response = dualResponses.get(agent);
      if (response) {
        setTranscript((prev) => [...prev, response]);
      }
      setDualResponses(new Map());
    }

    wsClientRef.current?.sendControl('swap', { agent });
    
    // Optimistic update
    setSession((prev) => ({
      ...prev,
      primaryAgent: agent,
      mode: 'single', // Switch back to single mode after selection
      activeAgents: [agent],
    }));
  }, [session.mode, dualResponses]);

  // Toggle dual mode
  const toggleDualMode = useCallback(() => {
    const newMode = session.mode === 'single' ? 'dual' : 'single';
    wsClientRef.current?.sendControl('toggle-dual', { enabled: newMode === 'dual' });
    
    // Clear dual responses when toggling
    setDualResponses(new Map());
    
    // Optimistic update
    setSession((prev) => ({
      ...prev,
      mode: newMode,
      activeAgents: newMode === 'dual' ? ['openai-v2v', 'elevenlabs'] : [prev.primaryAgent],
    }));
  }, [session.mode]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Clear dual responses
  const clearDualResponses = useCallback(() => {
    setDualResponses(new Map());
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      wsClientRef.current?.disconnect();
      audioCaptureRef.current?.stop();
      audioPlaybackRef.current?.stop();
    };
  }, []);

  return {
    session,
    transcript,
    dualResponses,
    isRecording,
    isConnected,
    isPlaying,
    error,
    connect,
    disconnect,
    startRecording,
    stopRecording,
    selectAgent,
    toggleDualMode,
    clearError,
    clearDualResponses,
  };
}

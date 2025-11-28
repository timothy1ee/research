import { useCallback, useEffect, useState } from 'react';
import { useConversation } from '@elevenlabs/react';
import { Header, AgentCard, Transcript, RecordButton } from './components';
import { useVoiceChat } from './hooks/useVoiceChat';
import type { AgentType, AgentInfo, TranscriptItem } from './types';
import './App.css';

const ELEVENLABS_AGENT_ID = import.meta.env.VITE_ELEVENLABS_AGENT_ID || '';

// Agent configuration
const AGENTS: AgentInfo[] = [
  {
    type: 'openai-v2v',
    name: 'OpenAI V2V',
    description: 'Voice-to-voice using OpenAI Realtime API. Low latency, natural conversation.',
    voice: 'Alloy',
    icon: '🤖',
  },
  {
    type: 'openai-stt',
    name: 'OpenAI STT',
    description: 'Speech-to-Text → GPT-4 → Text-to-Speech. More control, higher latency.',
    voice: 'Nova',
    icon: '🔊',
  },
  {
    type: 'elevenlabs',
    name: 'ElevenLabs',
    description: 'Conversational AI with premium voice quality and natural expressions.',
    voice: 'Rachel',
    icon: '🎭',
  },
];

function App() {
  const {
    session,
    transcript,
    isRecording,
    isConnected,
    error,
    connect,
    startRecording,
    stopRecording,
    selectAgent,
    clearError,
  } = useVoiceChat();

  // ElevenLabs SDK integration
  const [elevenLabsTranscript, setElevenLabsTranscript] = useState<TranscriptItem[]>([]);
  const [isElevenLabsActive, setIsElevenLabsActive] = useState(false);
  const [elevenLabsError, setElevenLabsError] = useState<string | null>(null);
  const [localPrimaryAgent, setLocalPrimaryAgent] = useState<AgentType>(session.primaryAgent);

  const elevenLabs = useConversation({
    onConnect: () => {
      console.log('[ElevenLabs SDK] Connected');
      setIsElevenLabsActive(true);
    },
    onDisconnect: () => {
      console.log('[ElevenLabs SDK] Disconnected');
      setIsElevenLabsActive(false);
    },
    onMessage: (message) => {
      console.log('[ElevenLabs SDK] Message:', message);
      // Add transcript based on message type
      if (message.source === 'user') {
        setElevenLabsTranscript(prev => [...prev, {
          id: `user-${Date.now()}`,
          role: 'user',
          text: message.message,
          timestamp: new Date(),
        }]);
      } else if (message.source === 'ai') {
        setElevenLabsTranscript(prev => [...prev, {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          agent: 'elevenlabs',
          text: message.message,
          timestamp: new Date(),
        }]);
      }
    },
    onError: (error) => {
      console.error('[ElevenLabs SDK] Error:', error);
      setElevenLabsError(error.message || 'ElevenLabs error');
    },
  });

  const isUsingElevenLabs = localPrimaryAgent === 'elevenlabs';

  // Start ElevenLabs when selected
  const startElevenLabs = useCallback(async () => {
    if (!ELEVENLABS_AGENT_ID) {
      setElevenLabsError('VITE_ELEVENLABS_AGENT_ID not configured');
      return;
    }
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Warm up browser AudioContext before starting (fixes audio glitches)
      const warmupCtx = new AudioContext();
      await warmupCtx.resume();
      // Play a tiny silent buffer to fully initialize audio pipeline
      const buffer = warmupCtx.createBuffer(1, 1, warmupCtx.sampleRate);
      const source = warmupCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(warmupCtx.destination);
      source.start();
      await new Promise(resolve => setTimeout(resolve, 100));
      await warmupCtx.close();
      
      await elevenLabs.startSession({
        agentId: ELEVENLABS_AGENT_ID,
      });
    } catch (err) {
      console.error('[ElevenLabs SDK] Start error:', err);
      setElevenLabsError(err instanceof Error ? err.message : 'Failed to start ElevenLabs');
    }
  }, [elevenLabs]);

  const stopElevenLabs = useCallback(async () => {
    try {
      await elevenLabs.endSession();
    } catch (err) {
      console.error('[ElevenLabs SDK] Stop error:', err);
    }
  }, [elevenLabs]);

  // Sync localPrimaryAgent with session when backend updates (for OpenAI agents)
  useEffect(() => {
    if (session.primaryAgent !== 'elevenlabs') {
      setLocalPrimaryAgent(session.primaryAgent);
    }
  }, [session.primaryAgent]);

  // Auto-connect on mount (for OpenAI backend)
  useEffect(() => {
    connect();
  }, [connect]);

  // Clear error after 5 seconds
  useEffect(() => {
    const currentError = error || elevenLabsError;
    if (currentError) {
      const timer = setTimeout(() => {
        clearError();
        setElevenLabsError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, elevenLabsError, clearError]);

  // Handle agent selection with ElevenLabs SDK integration
  const handleSelectAgent = useCallback(async (agentType: AgentType) => {
    // If switching away from ElevenLabs, stop SDK
    if (localPrimaryAgent === 'elevenlabs' && agentType !== 'elevenlabs') {
      await stopElevenLabs();
    }
    
    // Update local tracking
    setLocalPrimaryAgent(agentType);
    
    // For ElevenLabs, only use SDK (don't tell backend to connect)
    if (agentType === 'elevenlabs') {
      // The SDK handles everything directly
      await startElevenLabs();
    } else {
      // For OpenAI agents, use backend
      selectAgent(agentType);
    }
  }, [localPrimaryAgent, selectAgent, startElevenLabs, stopElevenLabs]);

  // Determine connection status - include ElevenLabs SDK status
  const elevenLabsConnected = elevenLabs.status === 'connected';
  const anyAgentConnected = Object.values(session.agentStatuses).some(
    (status) => status === 'connected'
  ) || elevenLabsConnected;

  // Use ElevenLabs transcript when that agent is active
  const displayTranscript = isUsingElevenLabs ? elevenLabsTranscript : transcript;
  
  // Combine errors
  const displayError = error || elevenLabsError;
  
  // ElevenLabs speaking status
  const isAgentSpeaking = isUsingElevenLabs ? elevenLabs.isSpeaking : false;

  return (
    <div className="app">
      <Header />
      
      {displayError && (
        <div className="error-banner">
          <span>⚠️ {displayError}</span>
          <button onClick={() => { clearError(); setElevenLabsError(null); }}>×</button>
        </div>
      )}
      
      <main className="main-content">
        <section className="agents-section">
          <h2 className="section-title">Agents</h2>
          <div className="agents-grid">
            {AGENTS.map((agent) => {
              // For ElevenLabs, use SDK status
              const status = agent.type === 'elevenlabs' 
                ? (elevenLabs.status === 'connected' ? 'connected' : 
                   elevenLabs.status === 'connecting' ? 'connecting' : 'disconnected')
                : session.agentStatuses[agent.type];
              
              // Use localPrimaryAgent for isPrimary to reflect ElevenLabs selection
              const isPrimary = localPrimaryAgent === agent.type;
              
              return (
                <AgentCard
                  key={agent.type}
                  type={agent.type}
                  name={agent.name}
                  description={agent.description}
                  voice={agent.voice}
                  status={status}
                  isActive={isPrimary || session.activeAgents.includes(agent.type)}
                  isPrimary={isPrimary}
                  onSelect={() => handleSelectAgent(agent.type)}
                />
              );
            })}
          </div>
          
          <div className="connection-status">
            <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`} />
            <span>{isConnected ? 'Connected to server' : 'Disconnected'}</span>
          </div>
        </section>
        
        <section className="conversation-section">
          <div className="transcript-container">
            <Transcript items={displayTranscript} />
            {isUsingElevenLabs && isAgentSpeaking && (
              <div className="speaking-indicator">🔊 Agent is speaking...</div>
            )}
          </div>
          
          <div className="controls-container">
            {isUsingElevenLabs ? (
              // ElevenLabs: SDK handles audio automatically, just show status
              <div className="elevenlabs-status">
                <div className={`status-badge ${elevenLabs.status}`}>
                  {elevenLabs.status === 'connected' ? '🎙️ Listening...' : 
                   elevenLabs.status === 'connecting' ? '⏳ Connecting...' : 
                   '❌ Not connected'}
                </div>
                <p className="hint">ElevenLabs handles audio automatically - just speak!</p>
              </div>
            ) : (
              // OpenAI: Use push-to-talk
              <RecordButton
                isRecording={isRecording}
                isConnected={anyAgentConnected}
                onStartRecording={startRecording}
                onStopRecording={stopRecording}
              />
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;

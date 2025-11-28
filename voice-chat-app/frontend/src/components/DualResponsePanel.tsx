import { useState, useCallback } from 'react';
import type { AgentType, TranscriptItem } from '../types';
import './DualResponsePanel.css';

interface DualResponsePanelProps {
  responses: Map<AgentType, TranscriptItem>;
  onSelectAgent: (agent: AgentType) => void;
  onPlayResponse: (agent: AgentType) => void;
}

const AGENT_NAMES: Record<AgentType, string> = {
  'openai-v2v': 'OpenAI V2V',
  'openai-stt': 'OpenAI STT',
  'elevenlabs': 'ElevenLabs',
};

const AGENT_COLORS: Record<AgentType, string> = {
  'openai-v2v': '#10b981',
  'openai-stt': '#6366f1',
  'elevenlabs': '#f59e0b',
};

export function DualResponsePanel({ 
  responses, 
  onSelectAgent, 
  onPlayResponse 
}: DualResponsePanelProps) {
  const [playingAgent, setPlayingAgent] = useState<AgentType | null>(null);

  const handlePlay = useCallback((agent: AgentType) => {
    setPlayingAgent(agent);
    onPlayResponse(agent);
    // Reset after a delay (should ideally be based on actual playback)
    setTimeout(() => setPlayingAgent(null), 3000);
  }, [onPlayResponse]);

  const handleSelect = useCallback((agent: AgentType) => {
    onSelectAgent(agent);
  }, [onSelectAgent]);

  const agents = Array.from(responses.keys());

  if (agents.length === 0) {
    return null;
  }

  return (
    <div className="dual-response-panel">
      <div className="dual-header">
        <h3>🔀 Dual Response - Choose one to continue:</h3>
      </div>
      
      <div className="dual-grid">
        {agents.map((agent) => {
          const response = responses.get(agent);
          if (!response) return null;

          return (
            <div 
              key={agent} 
              className="response-card"
              style={{ '--agent-color': AGENT_COLORS[agent] } as React.CSSProperties}
            >
              <div className="response-header">
                <span 
                  className="agent-name"
                  style={{ color: AGENT_COLORS[agent] }}
                >
                  {AGENT_NAMES[agent]}
                </span>
                <span className="response-time">
                  {response.timestamp.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </span>
              </div>
              
              <div className="response-content">
                <p>{response.text}</p>
              </div>
              
              <div className="response-actions">
                <button 
                  className={`btn-play ${playingAgent === agent ? 'playing' : ''}`}
                  onClick={() => handlePlay(agent)}
                  disabled={playingAgent !== null}
                >
                  {playingAgent === agent ? '🔊 Playing...' : '▶ Play'}
                </button>
                <button 
                  className="btn-continue"
                  onClick={() => handleSelect(agent)}
                >
                  ✓ Continue with
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


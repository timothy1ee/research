import { useEffect, useRef } from 'react';
import type { TranscriptItem, AgentType } from '../types';
import './Transcript.css';

interface TranscriptProps {
  items: TranscriptItem[];
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

export function Transcript({ items }: TranscriptProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="transcript empty">
        <div className="empty-state">
          <span className="empty-icon">💬</span>
          <p>Start talking to begin the conversation</p>
        </div>
      </div>
    );
  }

  return (
    <div className="transcript">
      <div className="transcript-header">
        <h3>Conversation</h3>
      </div>
      <div className="transcript-content" ref={contentRef}>
        {items.map((item) => (
          <div 
            key={item.id} 
            className={`transcript-item ${item.role}`}
          >
            <div className="transcript-meta">
              {item.role === 'user' ? (
                <span className="speaker user">You</span>
              ) : (
                <span 
                  className="speaker assistant"
                  style={{ color: item.agent ? AGENT_COLORS[item.agent] : '#94a3b8' }}
                >
                  {item.agent ? AGENT_NAMES[item.agent] : 'Assistant'}
                </span>
              )}
              <span className="timestamp">
                {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="transcript-text">{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

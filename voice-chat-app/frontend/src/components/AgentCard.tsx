import type { AgentType, AgentStatus } from '../types';
import './AgentCard.css';

interface AgentCardProps {
  type: AgentType;
  name: string;
  description: string;
  voice: string;
  status: AgentStatus;
  isActive: boolean;
  isPrimary: boolean;
  onSelect: () => void;
}

const STATUS_LABELS: Record<AgentStatus, string> = {
  disconnected: 'Ready',
  connecting: 'Connecting...',
  connected: 'Connected',
  error: 'Error',
};

const STATUS_ICONS: Record<AgentStatus, string> = {
  disconnected: '⚪',
  connecting: '🟡',
  connected: '🟢',
  error: '🔴',
};

export function AgentCard({
  name,
  description,
  voice,
  status,
  isActive,
  isPrimary,
  onSelect,
}: AgentCardProps) {
  return (
    <div 
      className={`agent-card ${isActive ? 'active' : ''} ${isPrimary ? 'primary' : ''}`}
      onClick={onSelect}
    >
      <div className="agent-header">
        <h3 className="agent-name">{name}</h3>
        <span className="agent-status">
          {STATUS_ICONS[status]} {STATUS_LABELS[status]}
        </span>
      </div>
      
      <p className="agent-description">{description}</p>
      
      <div className="agent-voice">
        <span className="voice-label">Voice:</span>
        <span className="voice-value">{voice}</span>
      </div>
      
      <div className="agent-action">
        {isPrimary ? (
          <button className="btn-active" disabled>
            ▶ ACTIVE
          </button>
        ) : (
          <button className="btn-select">
            SELECT
          </button>
        )}
      </div>
    </div>
  );
}


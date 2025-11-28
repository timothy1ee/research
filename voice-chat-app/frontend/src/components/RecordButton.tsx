import { useState, useCallback } from 'react';
import './RecordButton.css';

interface RecordButtonProps {
  isRecording: boolean;
  isConnected: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

export function RecordButton({
  isRecording,
  isConnected,
  onStartRecording,
  onStopRecording,
}: RecordButtonProps) {
  const [isHolding, setIsHolding] = useState(false);

  const handleMouseDown = useCallback(() => {
    if (!isConnected) return;
    setIsHolding(true);
    onStartRecording();
  }, [isConnected, onStartRecording]);

  const handleMouseUp = useCallback(() => {
    if (isHolding) {
      setIsHolding(false);
      onStopRecording();
    }
  }, [isHolding, onStopRecording]);

  const handleMouseLeave = useCallback(() => {
    if (isHolding) {
      setIsHolding(false);
      onStopRecording();
    }
  }, [isHolding, onStopRecording]);

  return (
    <div className="record-container">
      <div className={`record-ring ${isRecording ? 'active' : ''}`}>
        <button
          className={`record-button ${isRecording ? 'recording' : ''} ${!isConnected ? 'disabled' : ''}`}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleMouseDown}
          onTouchEnd={handleMouseUp}
          disabled={!isConnected}
        >
          <span className="record-icon">🎤</span>
        </button>
      </div>
      <p className="record-label">
        {!isConnected 
          ? 'Select an agent to start'
          : isRecording 
            ? '🔴 Recording...' 
            : 'Hold to Talk'}
      </p>
      <p className="record-hint">
        {isConnected && !isRecording && 'Release to send'}
      </p>
    </div>
  );
}


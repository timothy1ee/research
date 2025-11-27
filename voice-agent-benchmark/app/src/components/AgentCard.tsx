import { useRef, useEffect, useState } from 'react';
import {
  Mic,
  Play,
  Pause,
  Settings,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  Volume2,
  CheckCircle,
  AlertCircle,
  Clock,
} from 'lucide-react';
import type { AgentSlot, AgentStatus } from '../types';
import { useAppStore } from '../store';
import { PROVIDER_INFO } from '../providers';

interface AgentCardProps {
  agent: AgentSlot;
}

export function AgentCard({ agent }: AgentCardProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const {
    triggerAgentResponse,
    rateResponse,
    openConfigPanel,
  } = useAppStore();

  const providerInfo = PROVIDER_INFO[agent.providerId];
  const lastMessage = agent.conversationHistory[agent.conversationHistory.length - 1];
  const isAssistantMessage = lastMessage?.role === 'assistant';

  // Get status styles
  const getStatusStyles = (status: AgentStatus) => {
    switch (status) {
      case 'idle':
        return 'border-gray-600 bg-gray-800/50 opacity-75';
      case 'ready':
        return 'border-blue-500 bg-gray-800 ring-2 ring-blue-500/50 cursor-pointer hover:bg-gray-700';
      case 'processing':
        return 'border-yellow-500 bg-gray-800 ring-2 ring-yellow-500/50';
      case 'speaking':
        return 'border-green-500 bg-gray-800 ring-2 ring-green-500/50';
      case 'complete':
        return 'border-gray-500 bg-gray-800';
      case 'error':
        return 'border-red-500 bg-gray-800 ring-2 ring-red-500/50';
      default:
        return 'border-gray-600 bg-gray-800';
    }
  };

  // Initialize audio context for visualization
  useEffect(() => {
    if (lastMessage?.audioUrl && audioRef.current && !audioContext) {
      const ctx = new AudioContext();
      const analyserNode = ctx.createAnalyser();
      analyserNode.fftSize = 256;

      const source = ctx.createMediaElementSource(audioRef.current);
      source.connect(analyserNode);
      analyserNode.connect(ctx.destination);

      setAudioContext(ctx);
      setAnalyser(analyserNode);
    }
  }, [lastMessage?.audioUrl]);

  // Draw waveform visualization
  useEffect(() => {
    if (!canvasRef.current || !analyser || !isPlaying) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!isPlaying) return;

      requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = 'rgb(31, 41, 55)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height;

        // Use agent's color
        ctx.fillStyle = agent.color;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    draw();
  }, [isPlaying, analyser, agent.color]);

  const handleCardClick = () => {
    if (agent.status === 'ready') {
      triggerAgentResponse(agent.id);
    }
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const handleAudioPlay = () => {
    setIsPlaying(true);
    useAppStore.getState().setAgentStatus(agent.id, 'speaking');
  };

  const handleAudioPause = () => {
    setIsPlaying(false);
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    useAppStore.getState().setAgentStatus(agent.id, 'complete');
  };

  const handleRate = (rating: number) => {
    rateResponse(agent.id, rating);
  };

  const formatMetric = (value: number, unit: string) => {
    return `${Math.round(value)}${unit}`;
  };

  return (
    <div
      className={`relative rounded-xl border-2 p-4 transition-all duration-300 ${getStatusStyles(agent.status)}`}
      onClick={handleCardClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: agent.color }}
          />
          <span className="font-semibold text-white">{agent.name}</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            openConfigPanel(agent.id);
          }}
          className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Settings size={16} className="text-gray-400" />
        </button>
      </div>

      {/* Provider & Voice Info */}
      <div className="text-sm text-gray-400 mb-3">
        <div>{providerInfo.name}</div>
        <div className="text-xs">
          {agent.voiceName} • {agent.modelName}
        </div>
      </div>

      {/* Status Indicator */}
      <div className="flex items-center gap-2 mb-3">
        {agent.status === 'idle' && (
          <span className="text-xs text-gray-500">Waiting for input</span>
        )}
        {agent.status === 'ready' && (
          <span className="text-xs text-blue-400 flex items-center gap-1">
            <Mic size={12} /> Click to trigger response
          </span>
        )}
        {agent.status === 'processing' && (
          <span className="text-xs text-yellow-400 flex items-center gap-1">
            <Loader2 size={12} className="animate-spin" /> Processing...
          </span>
        )}
        {agent.status === 'speaking' && (
          <span className="text-xs text-green-400 flex items-center gap-1">
            <Volume2 size={12} /> Speaking...
          </span>
        )}
        {agent.status === 'complete' && (
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <CheckCircle size={12} /> Complete
          </span>
        )}
        {agent.status === 'error' && (
          <span className="text-xs text-red-400 flex items-center gap-1">
            <AlertCircle size={12} /> Error
          </span>
        )}
      </div>

      {/* Audio Visualization */}
      {lastMessage?.audioUrl && (
        <div className="mb-3">
          <canvas
            ref={canvasRef}
            width={200}
            height={40}
            className="w-full h-10 rounded bg-gray-900"
          />
          <audio
            ref={audioRef}
            src={lastMessage.audioUrl}
            onPlay={handleAudioPlay}
            onPause={handleAudioPause}
            onEnded={handleAudioEnded}
          />
        </div>
      )}

      {/* Response Text Preview */}
      {isAssistantMessage && lastMessage.content && (
        <div className="text-sm text-gray-300 mb-3 line-clamp-2">
          "{lastMessage.content}"
        </div>
      )}

      {/* Playback Controls */}
      {isAssistantMessage && lastMessage.audioUrl && (
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePlayPause();
            }}
            className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
          >
            {isPlaying ? (
              <Pause size={16} className="text-white" />
            ) : (
              <Play size={16} className="text-white" />
            )}
          </button>
        </div>
      )}

      {/* Metrics */}
      {isAssistantMessage && lastMessage.metrics && (
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 mb-3">
          <div className="flex items-center gap-1">
            <Clock size={10} />
            TTFB: {formatMetric(lastMessage.metrics.ttfb, 'ms')}
          </div>
          <div>Total: {formatMetric(lastMessage.metrics.totalTime, 'ms')}</div>
          <div>Audio: {formatMetric(lastMessage.metrics.audioDuration, 'ms')}</div>
          {lastMessage.metrics.estimatedCost !== undefined && (
            <div>Cost: ${lastMessage.metrics.estimatedCost.toFixed(4)}</div>
          )}
        </div>
      )}

      {/* Rating */}
      {isAssistantMessage && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Rate:</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRate(1);
            }}
            className={`p-1.5 rounded-lg transition-colors ${
              lastMessage.rating === 1
                ? 'bg-green-600 text-white'
                : 'hover:bg-gray-700 text-gray-400'
            }`}
          >
            <ThumbsUp size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRate(-1);
            }}
            className={`p-1.5 rounded-lg transition-colors ${
              lastMessage.rating === -1
                ? 'bg-red-600 text-white'
                : 'hover:bg-gray-700 text-gray-400'
            }`}
          >
            <ThumbsDown size={14} />
          </button>
        </div>
      )}

      {/* Processing Overlay */}
      {agent.status === 'processing' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 rounded-xl">
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={32} className="animate-spin text-yellow-400" />
            <span className="text-sm text-yellow-400">Processing...</span>
          </div>
        </div>
      )}
    </div>
  );
}

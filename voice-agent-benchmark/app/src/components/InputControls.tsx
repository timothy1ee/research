import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Send, SkipForward, Loader2 } from 'lucide-react';
import { useAppStore } from '../store';

export function InputControls() {
  const {
    userInput,
    setUserInput,
    setUserAudioBlob,
    isRecording,
    setIsRecording,
    submitUserInput,
    nextTurn,
    session,
  } = useAppStore();

  const [audioLevel, setAudioLevel] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | undefined>(undefined);

  // Check if any agent is processing
  const isAnyProcessing = session.agents.some(
    (a) => a.status === 'processing' || a.status === 'speaking'
  );

  // Check if we're in a turn (agents are ready/complete)
  const isInTurn = session.agents.some(
    (a) => a.status === 'ready' || a.status === 'complete'
  );

  // Check if all agents have responded
  const allAgentsResponded = session.agents.every(
    (a) => a.status === 'complete' || a.status === 'error' || a.status === 'idle'
  );

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Set up audio analysis for level meter
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      // Start level monitoring
      const updateLevel = () => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioLevel(average / 255);
        animationRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();

      // Set up media recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());

        // Stop level monitoring
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        setAudioLevel(0);

        // Create audio blob
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setUserAudioBlob(audioBlob);

        // Transcribe using Web Speech API if available
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
          // Note: For real transcription, you'd want to use a proper STT service
          // This is just a placeholder for demo purposes
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please ensure microphone permissions are granted.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleSubmit = () => {
    if (!userInput.trim()) return;
    submitUserInput();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Handle spacebar for push-to-talk
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body && !isRecording) {
        e.preventDefault();
        startRecording();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isRecording) {
        e.preventDefault();
        stopRecording();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isRecording]);

  return (
    <div className="border-t border-gray-700 bg-gray-900 p-4">
      {/* Current user input display */}
      {session.turns.length > 0 && isInTurn && (
        <div className="mb-4 p-3 bg-gray-800 rounded-lg">
          <div className="text-xs text-gray-500 mb-1">Your message:</div>
          <div className="text-gray-200">
            {session.turns[session.turns.length - 1]?.userInput.text}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="flex items-center gap-3">
        {/* Mic button */}
        <button
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onMouseLeave={isRecording ? stopRecording : undefined}
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
          disabled={isInTurn}
          className={`relative p-4 rounded-full transition-all ${
            isRecording
              ? 'bg-red-600 scale-110'
              : isInTurn
              ? 'bg-gray-700 opacity-50 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500'
          }`}
        >
          {isRecording ? (
            <MicOff size={24} className="text-white" />
          ) : (
            <Mic size={24} className="text-white" />
          )}

          {/* Audio level indicator */}
          {isRecording && (
            <div
              className="absolute inset-0 rounded-full bg-red-400 opacity-50 animate-ping"
              style={{ transform: `scale(${1 + audioLevel * 0.5})` }}
            />
          )}
        </button>

        {/* Text input */}
        <div className="flex-1 relative">
          <textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isInTurn
                ? 'Click agents to hear their responses, then click Next Turn...'
                : 'Type a message or hold spacebar/mic to record...'
            }
            disabled={isInTurn}
            className="w-full p-3 pr-12 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 resize-none focus:outline-none focus:border-blue-500 disabled:opacity-50"
            rows={1}
          />
          <button
            onClick={handleSubmit}
            disabled={!userInput.trim() || isInTurn}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={18} className="text-white" />
          </button>
        </div>

        {/* Next Turn button */}
        {isInTurn && allAgentsResponded && (
          <button
            onClick={nextTurn}
            className="flex items-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-500 rounded-lg text-white font-medium transition-colors"
          >
            <SkipForward size={18} />
            Next Turn
          </button>
        )}

        {/* Processing indicator */}
        {isAnyProcessing && (
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-800 rounded-lg text-yellow-400">
            <Loader2 size={18} className="animate-spin" />
            <span>Processing...</span>
          </div>
        )}
      </div>

      {/* Help text */}
      <div className="mt-2 text-xs text-gray-500 text-center">
        {isRecording
          ? 'Release to stop recording'
          : isInTurn
          ? 'Click on agent cards to trigger responses'
          : 'Hold spacebar or click mic to record • Press Enter to send text'}
      </div>
    </div>
  );
}

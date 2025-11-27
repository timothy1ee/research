import { useState } from 'react';
import { Sun, Moon, RotateCcw, TestTube, Server } from 'lucide-react';
import { useAppStore } from '../store';

export function Header() {
  const {
    session,
    updateSystemPrompt,
    initializeSession,
    isDarkMode,
    toggleDarkMode,
    useMockProviders,
    setUseMockProviders,
  } = useAppStore();

  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [promptValue, setPromptValue] = useState(session.systemPrompt);

  const handlePromptSave = () => {
    updateSystemPrompt(promptValue);
    setIsEditingPrompt(false);
  };

  const handlePromptCancel = () => {
    setPromptValue(session.systemPrompt);
    setIsEditingPrompt(false);
  };

  return (
    <header className="bg-gray-900 border-b border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-white">Voice Agent Benchmark</h1>
          <span className="px-2 py-0.5 bg-blue-600 text-xs text-white rounded-full">
            Beta
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Mock/Real Toggle */}
          <button
            onClick={() => setUseMockProviders(!useMockProviders)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
              useMockProviders
                ? 'bg-yellow-600/20 text-yellow-400 border border-yellow-600'
                : 'bg-green-600/20 text-green-400 border border-green-600'
            }`}
            title={useMockProviders ? 'Using mock providers (no API keys needed)' : 'Using real API providers'}
          >
            {useMockProviders ? (
              <>
                <TestTube size={16} />
                <span className="text-sm">Mock Mode</span>
              </>
            ) : (
              <>
                <Server size={16} />
                <span className="text-sm">Live Mode</span>
              </>
            )}
          </button>

          {/* Reset Session */}
          <button
            onClick={initializeSession}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            title="Reset session"
          >
            <RotateCcw size={18} className="text-gray-400" />
          </button>

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            title="Toggle dark mode"
          >
            {isDarkMode ? (
              <Sun size={18} className="text-gray-400" />
            ) : (
              <Moon size={18} className="text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {/* System Prompt */}
      <div className="bg-gray-800 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-300">System Prompt</label>
          {!isEditingPrompt && (
            <button
              onClick={() => setIsEditingPrompt(true)}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              Edit
            </button>
          )}
        </div>

        {isEditingPrompt ? (
          <div>
            <textarea
              value={promptValue}
              onChange={(e) => setPromptValue(e.target.value)}
              className="w-full p-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm resize-none focus:outline-none focus:border-blue-500"
              rows={3}
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={handlePromptCancel}
                className="px-3 py-1 text-sm text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handlePromptSave}
                className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 line-clamp-2">{session.systemPrompt}</p>
        )}
      </div>

      {/* Session Stats */}
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
        <span>Turns: {session.turns.length}</span>
        <span>Agents: {session.agents.length}</span>
        {useMockProviders && (
          <span className="text-yellow-500">
            Mock mode - responses are simulated
          </span>
        )}
      </div>
    </header>
  );
}

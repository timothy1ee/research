import { useState, useEffect } from 'react';
import { X, Eye, EyeOff, Play, Check } from 'lucide-react';
import { useAppStore } from '../store';
import { PROVIDER_INFO, createProvider, saveApiKey, getApiKey } from '../providers';
import type { ProviderId, Voice, Model } from '../types';

export function ConfigPanel() {
  const {
    isConfigPanelOpen,
    configPanelAgentId,
    closeConfigPanel,
    session,
    updateAgent,
    useMockProviders,
  } = useAppStore();

  const agent = session.agents.find((a) => a.id === configPanelAgentId);

  const [name, setName] = useState('');
  const [providerId, setProviderId] = useState<ProviderId>('openai');
  const [voiceId, setVoiceId] = useState('');
  const [modelId, setModelId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [previewVoiceId, setPreviewVoiceId] = useState<string | null>(null);

  // Load agent data when panel opens
  useEffect(() => {
    if (agent) {
      setName(agent.name);
      setProviderId(agent.providerId);
      setVoiceId(agent.voiceId);
      setModelId(agent.modelId);
      setApiKey(getApiKey(agent.providerId) || '');
      loadProviderOptions(agent.providerId);
    }
  }, [agent]);

  // Load voices and models for provider
  const loadProviderOptions = async (pid: ProviderId) => {
    setIsLoadingVoices(true);
    try {
      const provider = createProvider(pid, useMockProviders);
      if (!useMockProviders && apiKey) {
        provider.configure({ apiKey });
      }

      const [voiceList, modelList] = await Promise.all([
        provider.getVoices(),
        provider.getModels(),
      ]);

      setVoices(voiceList);
      setModels(modelList);

      // Set defaults if current selection is invalid
      if (!voiceList.find((v) => v.id === voiceId) && voiceList.length > 0) {
        setVoiceId(voiceList[0].id);
      }
      if (!modelList.find((m) => m.id === modelId) && modelList.length > 0) {
        setModelId(modelList[0].id);
      }
    } catch (error) {
      console.error('Error loading provider options:', error);
      // Fall back to defaults
      const info = PROVIDER_INFO[pid];
      setVoices(info.defaultVoices);
      setModels(info.defaultModels);
    }
    setIsLoadingVoices(false);
  };

  // Handle provider change
  const handleProviderChange = (newProviderId: ProviderId) => {
    setProviderId(newProviderId);
    setApiKey(getApiKey(newProviderId) || '');
    loadProviderOptions(newProviderId);
  };

  // Save changes
  const handleSave = () => {
    if (!configPanelAgentId) return;

    // Save API key
    if (apiKey) {
      saveApiKey(providerId, apiKey);
    }

    // Find voice and model names
    const voice = voices.find((v) => v.id === voiceId);
    const model = models.find((m) => m.id === modelId);

    updateAgent(configPanelAgentId, {
      name,
      providerId,
      voiceId,
      voiceName: voice?.name || voiceId,
      modelId,
      modelName: model?.name || modelId,
      color: PROVIDER_INFO[providerId].color,
    });

    closeConfigPanel();
  };

  // Preview voice (placeholder - would need actual TTS call)
  const handlePreviewVoice = async (vid: string) => {
    setPreviewVoiceId(vid);
    // In a real implementation, this would make a TTS call
    // and play a sample audio
    setTimeout(() => setPreviewVoiceId(null), 2000);
  };

  if (!isConfigPanelOpen || !agent) return null;

  const providerInfo = PROVIDER_INFO[providerId];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-gray-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Configure Agent</h2>
          <button
            onClick={closeConfigPanel}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Agent Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Agent Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Provider
            </label>
            <select
              value={providerId}
              onChange={(e) => handleProviderChange(e.target.value as ProviderId)}
              className="w-full p-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              {Object.entries(PROVIDER_INFO).map(([id, info]) => (
                <option key={id} value={id}>
                  {info.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">{providerInfo.description}</p>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              API Key
              {useMockProviders && (
                <span className="ml-2 text-xs text-yellow-500">(Mock mode - not required)</span>
              )}
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={useMockProviders ? 'Optional in mock mode' : `Enter ${providerInfo.name} API key`}
                className="w-full p-2 pr-10 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white"
              >
                {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="mt-1 text-xs text-yellow-600">
              API keys are stored locally in your browser. Never share them.
            </p>
          </div>

          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Model
            </label>
            <select
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              disabled={isLoadingVoices}
              className="w-full p-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
            >
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                  {model.latency && ` (${model.latency} latency)`}
                </option>
              ))}
            </select>
          </div>

          {/* Voice Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Voice
            </label>
            <div className="max-h-48 overflow-y-auto bg-gray-900 border border-gray-700 rounded-lg">
              {isLoadingVoices ? (
                <div className="p-4 text-center text-gray-500">Loading voices...</div>
              ) : (
                voices.map((voice) => (
                  <div
                    key={voice.id}
                    className={`flex items-center justify-between p-2 hover:bg-gray-800 cursor-pointer ${
                      voiceId === voice.id ? 'bg-gray-700' : ''
                    }`}
                    onClick={() => setVoiceId(voice.id)}
                  >
                    <div className="flex items-center gap-2">
                      {voiceId === voice.id && (
                        <Check size={16} className="text-green-500" />
                      )}
                      <span className="text-white">{voice.name}</span>
                      {voice.gender && (
                        <span className="text-xs text-gray-500">({voice.gender})</span>
                      )}
                      {voice.accent && (
                        <span className="text-xs text-gray-500">{voice.accent}</span>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreviewVoice(voice.id);
                      }}
                      className="p-1 hover:bg-gray-600 rounded transition-colors"
                    >
                      {previewVoiceId === voice.id ? (
                        <span className="text-xs text-green-500">Playing...</span>
                      ) : (
                        <Play size={14} className="text-gray-400" />
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-gray-700">
          <button
            onClick={closeConfigPanel}
            className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

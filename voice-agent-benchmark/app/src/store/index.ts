import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AgentSlot,
  AgentStatus,
  Message,
  Turn,
  Session,
  LatencyMetrics,
  VoiceAgentProvider,
} from '../types';
import { createProvider, getApiKey } from '../providers';

// Default agent configurations
const DEFAULT_AGENTS: Omit<AgentSlot, 'id'>[] = [
  {
    name: 'OpenAI Agent',
    providerId: 'openai',
    voiceId: 'alloy',
    voiceName: 'Alloy',
    modelId: 'gpt-4o-realtime-preview',
    modelName: 'GPT-4o Realtime',
    config: {},
    conversationHistory: [],
    status: 'idle',
    color: '#10a37f',
  },
  {
    name: 'ElevenLabs Agent',
    providerId: 'elevenlabs',
    voiceId: 'EXAVITQu4vr4xnSDxMaL',
    voiceName: 'Sarah',
    modelId: 'eleven_flash_v2_5',
    modelName: 'Flash v2.5',
    config: {},
    conversationHistory: [],
    status: 'idle',
    color: '#8b5cf6',
  },
  {
    name: 'Deepgram Agent',
    providerId: 'deepgram',
    voiceId: 'aura-asteria-en',
    voiceName: 'Asteria',
    modelId: 'aura-2',
    modelName: 'Aura 2',
    config: {},
    conversationHistory: [],
    status: 'idle',
    color: '#13ef93',
  },
  {
    name: 'Cartesia Agent',
    providerId: 'cartesia',
    voiceId: 'a0e99841-438c-4a64-b679-ae501e7d6091',
    voiceName: 'Barbershop Man',
    modelId: 'sonic-english-2024-10-01',
    modelName: 'Sonic English',
    config: {},
    conversationHistory: [],
    status: 'idle',
    color: '#f59e0b',
  },
];

interface AppState {
  // Session state
  session: Session;
  currentTurnIndex: number;

  // UI state
  isRecording: boolean;
  userInput: string;
  userAudioBlob: Blob | null;
  selectedAgentId: string | null;
  isConfigPanelOpen: boolean;
  configPanelAgentId: string | null;
  isDarkMode: boolean;
  useMockProviders: boolean;

  // Provider instances
  providers: Map<string, VoiceAgentProvider>;

  // Actions
  initializeSession: () => void;
  updateSystemPrompt: (prompt: string) => void;

  // Agent actions
  updateAgent: (agentId: string, updates: Partial<AgentSlot>) => void;
  setAgentStatus: (agentId: string, status: AgentStatus) => void;
  addAgentMessage: (agentId: string, message: Message) => void;

  // Recording actions
  setIsRecording: (isRecording: boolean) => void;
  setUserInput: (input: string) => void;
  setUserAudioBlob: (blob: Blob | null) => void;

  // Turn actions
  submitUserInput: () => void;
  triggerAgentResponse: (agentId: string) => Promise<void>;
  rateResponse: (agentId: string, rating: number) => void;
  nextTurn: () => void;

  // UI actions
  selectAgent: (agentId: string | null) => void;
  openConfigPanel: (agentId: string) => void;
  closeConfigPanel: () => void;
  toggleDarkMode: () => void;
  setUseMockProviders: (useMock: boolean) => void;

  // Provider actions
  getOrCreateProvider: (agentId: string) => VoiceAgentProvider;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      session: {
        id: crypto.randomUUID(),
        systemPrompt: 'You are a helpful assistant. Be concise and friendly in your responses.',
        agents: DEFAULT_AGENTS.map((agent, index) => ({
          ...agent,
          id: `agent-${index}`,
        })),
        turns: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      currentTurnIndex: -1,
      isRecording: false,
      userInput: '',
      userAudioBlob: null,
      selectedAgentId: null,
      isConfigPanelOpen: false,
      configPanelAgentId: null,
      isDarkMode: true,
      useMockProviders: true, // Default to mock for testing without API keys
      providers: new Map(),

      // Initialize session
      initializeSession: () => {
        set({
          session: {
            id: crypto.randomUUID(),
            systemPrompt: 'You are a helpful assistant. Be concise and friendly in your responses.',
            agents: DEFAULT_AGENTS.map((agent, index) => ({
              ...agent,
              id: `agent-${index}`,
            })),
            turns: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          currentTurnIndex: -1,
          userInput: '',
          userAudioBlob: null,
          selectedAgentId: null,
          providers: new Map(),
        });
      },

      // Update system prompt
      updateSystemPrompt: (prompt: string) => {
        set((state) => ({
          session: {
            ...state.session,
            systemPrompt: prompt,
            updatedAt: Date.now(),
          },
        }));
      },

      // Update agent configuration
      updateAgent: (agentId: string, updates: Partial<AgentSlot>) => {
        set((state) => ({
          session: {
            ...state.session,
            agents: state.session.agents.map((agent) =>
              agent.id === agentId ? { ...agent, ...updates } : agent
            ),
            updatedAt: Date.now(),
          },
          // Clear the provider instance so it gets recreated with new config
          providers: new Map([...state.providers].filter(([id]) => id !== agentId)),
        }));
      },

      // Set agent status
      setAgentStatus: (agentId: string, status: AgentStatus) => {
        set((state) => ({
          session: {
            ...state.session,
            agents: state.session.agents.map((agent) =>
              agent.id === agentId ? { ...agent, status } : agent
            ),
          },
        }));
      },

      // Add message to agent's conversation history
      addAgentMessage: (agentId: string, message: Message) => {
        set((state) => ({
          session: {
            ...state.session,
            agents: state.session.agents.map((agent) =>
              agent.id === agentId
                ? { ...agent, conversationHistory: [...agent.conversationHistory, message] }
                : agent
            ),
          },
        }));
      },

      // Recording actions
      setIsRecording: (isRecording: boolean) => set({ isRecording }),
      setUserInput: (input: string) => set({ userInput: input }),
      setUserAudioBlob: (blob: Blob | null) => set({ userAudioBlob: blob }),

      // Submit user input and prepare for agent responses
      submitUserInput: () => {
        const { userInput, userAudioBlob } = get();

        if (!userInput.trim()) return;

        const newTurn: Turn = {
          id: crypto.randomUUID(),
          userInput: {
            text: userInput.trim(),
            audioBlob: userAudioBlob || undefined,
          },
          responses: new Map(),
          timestamp: Date.now(),
        };

        // Add user message to all agents' histories
        const userMessage: Message = {
          id: crypto.randomUUID(),
          role: 'user',
          content: userInput.trim(),
          timestamp: Date.now(),
        };

        set((state) => ({
          session: {
            ...state.session,
            turns: [...state.session.turns, newTurn],
            agents: state.session.agents.map((agent) => ({
              ...agent,
              status: 'ready' as AgentStatus,
              conversationHistory: [...agent.conversationHistory, userMessage],
            })),
            updatedAt: Date.now(),
          },
          currentTurnIndex: state.session.turns.length,
          userInput: '',
          userAudioBlob: null,
        }));
      },

      // Trigger response from a specific agent
      triggerAgentResponse: async (agentId: string) => {
        const { session, useMockProviders, getOrCreateProvider, setAgentStatus, addAgentMessage } = get();
        const agent = session.agents.find((a) => a.id === agentId);

        if (!agent) return;

        setAgentStatus(agentId, 'processing');

        try {
          const provider = getOrCreateProvider(agentId);

          // Get API key if not using mock
          if (!useMockProviders) {
            const apiKey = getApiKey(agent.providerId);
            if (apiKey) {
              provider.configure({ apiKey });
            }
          }

          // Configure voice and model
          provider.configure({
            voiceId: agent.voiceId,
            modelId: agent.modelId,
          });

          // Connect if not connected
          if (!provider.isConnected()) {
            await provider.connect();
          }

          let result: { text: string; audio: Blob; metrics: LatencyMetrics };

          // Check if provider supports full conversation
          if (provider.sendConversationMessage) {
            const lastUserMessage = agent.conversationHistory[agent.conversationHistory.length - 1];
            result = await provider.sendConversationMessage(
              lastUserMessage.content,
              agent.conversationHistory.slice(0, -1),
              session.systemPrompt
            );
          } else {
            // For TTS-only providers, we need to generate a response first
            // In a real app, this would call an LLM
            const mockResponse = `This is a response from ${agent.name} to: "${agent.conversationHistory[agent.conversationHistory.length - 1].content}"`;
            const synthResult = await provider.synthesize(mockResponse);
            result = {
              text: mockResponse,
              audio: synthResult.audio,
              metrics: synthResult.metrics,
            };
          }

          // Create audio URL
          const audioUrl = URL.createObjectURL(result.audio);

          // Add assistant message
          const assistantMessage: Message = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: result.text,
            audioUrl,
            audioBlob: result.audio,
            timestamp: Date.now(),
            metrics: result.metrics,
          };

          addAgentMessage(agentId, assistantMessage);

          // Update turn with response
          set((state) => {
            const currentTurn = state.session.turns[state.currentTurnIndex];
            if (currentTurn) {
              const newResponses = new Map(currentTurn.responses);
              newResponses.set(agentId, assistantMessage);

              return {
                session: {
                  ...state.session,
                  turns: state.session.turns.map((turn, idx) =>
                    idx === state.currentTurnIndex
                      ? { ...turn, responses: newResponses }
                      : turn
                  ),
                },
              };
            }
            return state;
          });

          setAgentStatus(agentId, 'complete');
        } catch (error) {
          console.error(`Error from ${agent.name}:`, error);
          setAgentStatus(agentId, 'error');
        }
      },

      // Rate a response
      rateResponse: (agentId: string, rating: number) => {
        set((state) => {
          const agent = state.session.agents.find((a) => a.id === agentId);
          if (!agent || agent.conversationHistory.length === 0) return state;

          const lastMessageIndex = agent.conversationHistory.length - 1;
          const updatedHistory = [...agent.conversationHistory];
          updatedHistory[lastMessageIndex] = {
            ...updatedHistory[lastMessageIndex],
            rating,
          };

          return {
            session: {
              ...state.session,
              agents: state.session.agents.map((a) =>
                a.id === agentId
                  ? { ...a, conversationHistory: updatedHistory }
                  : a
              ),
            },
          };
        });
      },

      // Move to next turn
      nextTurn: () => {
        set((state) => ({
          session: {
            ...state.session,
            agents: state.session.agents.map((agent) => ({
              ...agent,
              status: 'idle' as AgentStatus,
            })),
          },
        }));
      },

      // UI actions
      selectAgent: (agentId: string | null) => set({ selectedAgentId: agentId }),

      openConfigPanel: (agentId: string) => set({
        isConfigPanelOpen: true,
        configPanelAgentId: agentId,
      }),

      closeConfigPanel: () => set({
        isConfigPanelOpen: false,
        configPanelAgentId: null,
      }),

      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),

      setUseMockProviders: (useMock: boolean) => set({
        useMockProviders: useMock,
        providers: new Map(), // Clear providers when toggling
      }),

      // Get or create provider instance
      getOrCreateProvider: (agentId: string) => {
        const { session, useMockProviders, providers } = get();
        const agent = session.agents.find((a) => a.id === agentId);

        if (!agent) {
          throw new Error(`Agent not found: ${agentId}`);
        }

        // Check if we already have a provider for this agent
        let provider = providers.get(agentId);

        if (!provider) {
          // Create new provider
          provider = createProvider(agent.providerId, useMockProviders);
          provider.configure({
            voiceId: agent.voiceId,
            modelId: agent.modelId,
          });

          // Store it
          const newProviders = new Map(providers);
          newProviders.set(agentId, provider);
          set({ providers: newProviders });
        }

        return provider;
      },
    }),
    {
      name: 'voice-benchmark-storage',
      partialize: (state) => ({
        session: {
          ...state.session,
          // Don't persist conversation history between sessions for now
          agents: state.session.agents.map((a) => ({
            ...a,
            conversationHistory: [],
            status: 'idle' as AgentStatus,
          })),
          turns: [],
        },
        isDarkMode: state.isDarkMode,
        useMockProviders: state.useMockProviders,
      }),
    }
  )
);

import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { config } from 'dotenv';
import { logger } from './utils/logger.js';
import { OpenAIV2VAgent } from './agents/OpenAIV2VAgent.js';
import { OpenAISTTAgent } from './agents/OpenAISTTAgent.js';
import { ElevenLabsAgent } from './agents/ElevenLabsAgent.js';
import { BaseAgent, getAgentSampleRate } from './agents/BaseAgent.js';
import type { SessionState, AgentType, StatusMessage, ControlMessage, TranscriptMessage, ErrorMessage } from './types/index.js';

// Load environment variables
config();

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const WS_PORT = parseInt(process.env.WS_PORT || '3002', 10);

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Extended session with agent instances
interface ExtendedSession {
  state: SessionState;
  agents: Map<AgentType, BaseAgent>;
  clientWs: WebSocket;
}

// Session storage (in-memory for MVP)
const sessions = new Map<string, ExtendedSession>();

// Generate session ID
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Create initial session state
function createSessionState(id: string): SessionState {
  const primaryAgent: AgentType = 'openai-v2v';
  return {
    id,
    mode: 'single',
    activeAgents: [primaryAgent],
    primaryAgent,
    agentStatuses: {
      'openai-v2v': 'disconnected',
      'openai-stt': 'disconnected',
      'elevenlabs': 'disconnected',
    },
    sampleRate: getAgentSampleRate(primaryAgent),
  };
}

// Create agent instance
function createAgent(type: AgentType, session: ExtendedSession): BaseAgent | null {
  const events = {
    onAudioResponse: (audio: ArrayBuffer) => {
      // Send audio back to client
      if (session.clientWs.readyState === WebSocket.OPEN) {
        logger.debug('AUDIO', 'Sending audio response to client', { size: audio.byteLength, agent: type });
        session.clientWs.send(Buffer.from(audio));
      } else {
        logger.warn('AUDIO', 'Cannot send audio - client WebSocket not open', { readyState: session.clientWs.readyState });
      }
    },
    onTranscript: (role: 'user' | 'assistant', text: string, isFinal: boolean) => {
      // Send transcript to client
      const message: TranscriptMessage = {
        type: 'transcript',
        role,
        agent: type,
        text,
        isFinal,
      };
      if (session.clientWs.readyState === WebSocket.OPEN) {
        session.clientWs.send(JSON.stringify(message));
      }
    },
    onStatusChange: (status: 'disconnected' | 'connecting' | 'connected' | 'error') => {
      session.state.agentStatuses[type] = status;
      sendStatus(session.clientWs, session.state);
    },
    onError: (error: string) => {
      const message: ErrorMessage = {
        type: 'error',
        code: 'AGENT_ERROR',
        message: error,
        agent: type,
      };
      if (session.clientWs.readyState === WebSocket.OPEN) {
        session.clientWs.send(JSON.stringify(message));
      }
    },
  };

  switch (type) {
    case 'openai-v2v':
      return new OpenAIV2VAgent(events, {
        voice: 'alloy',
        instructions: 'You are a helpful, friendly assistant. Keep responses concise and conversational.',
      });
    case 'openai-stt':
      return new OpenAISTTAgent(events, {
        voice: 'nova',
        model: 'gpt-4o',
        instructions: 'You are a helpful, friendly assistant. Keep responses concise and conversational.',
      });
    case 'elevenlabs':
      return new ElevenLabsAgent(events, {
        voiceId: 'EXAVITQu4vr4xnSDxMaL', // Rachel voice
        instructions: 'You are a helpful, friendly assistant with a warm personality. Keep responses concise and conversational.',
      });
    default:
      return null;
  }
}

// Get or create agent for session
async function getOrCreateAgent(session: ExtendedSession, type: AgentType): Promise<BaseAgent | null> {
  let agent = session.agents.get(type);
  
  if (!agent) {
    agent = createAgent(type, session);
    if (agent) {
      session.agents.set(type, agent);
    }
  }
  
  return agent || null;
}

// WebSocket Server
const wss = new WebSocketServer({ port: WS_PORT });

logger.info('SERVER', `WebSocket server starting on port ${WS_PORT}`);

wss.on('connection', (ws: WebSocket) => {
  const sessionId = generateSessionId();
  const sessionState = createSessionState(sessionId);
  
  const session: ExtendedSession = {
    state: sessionState,
    agents: new Map(),
    clientWs: ws,
  };
  
  sessions.set(sessionId, session);

  logger.info('WEBSOCKET', 'Client connected', { sessionId });

  // Send initial status
  sendStatus(ws, sessionState);

  ws.on('message', async (data: Buffer, isBinary: boolean) => {
    // Log ALL messages for debugging - using INFO to ensure visibility
    logger.info('WEBSOCKET', 'Message received', { 
      sessionId, 
      isBinary, 
      dataType: typeof data,
      isBuffer: Buffer.isBuffer(data),
      size: data.length 
    });
    
    if (isBinary) {
      // Binary data = audio chunk
      logger.info('AUDIO', 'Received audio chunk from client', { sessionId, size: data.length });
      
      // Route audio to active agents
      logger.info('AUDIO', 'Active agents', { agents: session.state.activeAgents });
      for (const agentType of session.state.activeAgents) {
        const agent = session.agents.get(agentType);
        if (agent) {
          const status = agent.getStatus();
          logger.info('AUDIO', 'Agent status check', { agent: agentType, status });
          if (status === 'connected') {
            logger.info('AUDIO', 'Forwarding audio to agent', { agent: agentType, size: data.length });
            agent.sendAudio(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
          } else {
            logger.warn('AUDIO', 'Agent not connected, skipping', { agent: agentType, status });
          }
        } else {
          logger.warn('AUDIO', 'No agent instance found', { agent: agentType });
        }
      }
    } else {
      // Text data = control message
      try {
        const message = JSON.parse(data.toString()) as ControlMessage;
        logger.info('CONTROL', 'Received control message', { sessionId, action: message.action });
        
        await handleControlMessage(session, message);
      } catch (error) {
        logger.error('WEBSOCKET', 'Failed to parse message', { sessionId, error: String(error) });
      }
    }
  });

  ws.on('close', () => {
    logger.info('WEBSOCKET', 'Client disconnected', { sessionId });
    
    // Disconnect all agents
    for (const agent of session.agents.values()) {
      agent.disconnect();
    }
    
    sessions.delete(sessionId);
  });

  ws.on('error', (error) => {
    logger.error('WEBSOCKET', 'WebSocket error', { sessionId, error: error.message });
  });
});

async function handleControlMessage(session: ExtendedSession, message: ControlMessage): Promise<void> {
  const state = session.state;
  
  switch (message.action) {
    case 'start':
      logger.info('SESSION', 'Starting session', { sessionId: state.id });
      
      // Connect primary agent
      const primaryAgent = await getOrCreateAgent(session, state.primaryAgent);
      if (primaryAgent) {
        try {
          await primaryAgent.connect();
        } catch (error) {
          logger.error('SESSION', 'Failed to connect primary agent', { error: String(error) });
        }
      }
      break;

    case 'stop':
      logger.info('SESSION', 'Stopping session', { sessionId: state.id });
      
      // Disconnect all agents
      for (const agent of session.agents.values()) {
        agent.disconnect();
      }
      break;

    case 'swap':
      if (message.payload?.agent) {
        const newAgentType = message.payload.agent;
        logger.info('SESSION', 'Swapping agent', { 
          sessionId: state.id, 
          from: state.primaryAgent, 
          to: newAgentType 
        });
        
        state.primaryAgent = newAgentType;
        state.activeAgents = state.mode === 'dual' 
          ? state.activeAgents 
          : [newAgentType];
        
        // Update sample rate for new agent
        state.sampleRate = getAgentSampleRate(newAgentType);
        logger.info('SESSION', 'Sample rate changed', { 
          agent: newAgentType, 
          sampleRate: state.sampleRate 
        });
        
        // Connect new agent if not already connected
        const newAgent = await getOrCreateAgent(session, newAgentType);
        if (newAgent && newAgent.getStatus() === 'disconnected') {
          try {
            await newAgent.connect();
          } catch (error) {
            logger.error('SESSION', 'Failed to connect new agent', { error: String(error) });
          }
        }
      }
      break;

    case 'toggle-dual':
      const enabled = message.payload?.enabled ?? state.mode !== 'dual';
      state.mode = enabled ? 'dual' : 'single';
      logger.info('SESSION', 'Toggle dual mode', { sessionId: state.id, mode: state.mode });
      
      if (state.mode === 'dual') {
        // In dual mode, use OpenAI V2V and ElevenLabs
        state.activeAgents = ['openai-v2v', 'elevenlabs'];
        
        // Connect both agents
        for (const agentType of state.activeAgents) {
          const agent = await getOrCreateAgent(session, agentType);
          if (agent && agent.getStatus() === 'disconnected') {
            try {
              await agent.connect();
            } catch (error) {
              logger.error('SESSION', 'Failed to connect agent in dual mode', { 
                agent: agentType, 
                error: String(error) 
              });
            }
          }
        }
      } else {
        state.activeAgents = [state.primaryAgent];
      }
      break;

    case 'select':
      if (message.payload?.agent) {
        logger.info('SESSION', 'Selected agent response', { 
          sessionId: state.id, 
          agent: message.payload.agent 
        });
        state.primaryAgent = message.payload.agent;
        state.mode = 'single';
        state.activeAgents = [message.payload.agent];
      }
      break;

    case 'mic-release':
      // User released mic - commit audio buffer and request response
      logger.info('SESSION', 'Mic released - triggering response', { sessionId: state.id });
      
      for (const agentType of state.activeAgents) {
        const agent = session.agents.get(agentType);
        if (agent && agent.getStatus() === 'connected') {
          // For OpenAI V2V, commit and respond
          if (agentType === 'openai-v2v' && 'commitAndRespond' in agent) {
            (agent as OpenAIV2VAgent).commitAndRespond();
          }
        }
      }
      break;
  }

  sendStatus(session.clientWs, state);
}

function sendStatus(ws: WebSocket, session: SessionState): void {
  if (ws.readyState !== WebSocket.OPEN) return;
  
  const statusMessage: StatusMessage = {
    type: 'status',
    session,
  };
  ws.send(JSON.stringify(statusMessage));
}

// Start Express server
app.listen(PORT, () => {
  logger.info('SERVER', `HTTP server running on port ${PORT}`);
});

logger.info('SERVER', 'Voice Chat Backend initialized', { 
  httpPort: PORT, 
  wsPort: WS_PORT,
  logLevel: process.env.LOG_LEVEL || 'info'
});

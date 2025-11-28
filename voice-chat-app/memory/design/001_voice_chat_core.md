# Multi-Agent Voice Chat Core Design Document

## Metadata
- **Status:** Approved
- **Depends on:** None (foundation design)
- **Author(s):** AI Assistant
- **Created:** 2024-11-28
- **Updated:** 2024-11-28

## Overview

This document describes the core architecture for a multi-agent voice chat application that enables real-time voice conversations with AI providers (OpenAI and ElevenLabs). The application solves the problem of comparing and switching between different voice AI providers in real-time, while also enabling a unique "dual-agent" mode where users can speak to multiple agents simultaneously and choose which one to respond to.

The system supports two modes for OpenAI integration:
1. **Voice-to-Voice (Realtime API)**: Direct speech-in, speech-out using OpenAI's native Realtime API
2. **STT-LLM-TTS**: Separate Speech-to-Text → LLM → Text-to-Speech pipeline for more control

For ElevenLabs, we use their Conversational AI feature which provides a similar voice-to-voice experience.

## Goals

1. Enable real-time voice conversations with OpenAI (two modes) and ElevenLabs
2. Support hot-swapping between agents at any time during a conversation
3. Support dual-agent mode where both agents listen and respond, user picks which to continue
4. Provide a clean, intuitive UI for managing conversations and agent selection
5. Minimize latency for natural conversation flow
6. Handle audio input/output seamlessly in the browser

## User Scenario & Data Flow

### Core Scenario

**Tim (Developer/Researcher)** wants to compare voice AI providers in real-time. He starts a conversation with OpenAI's voice-to-voice mode, then hot-swaps to ElevenLabs mid-conversation to compare response quality. Later, he enables dual-agent mode to have both agents respond to the same question, choosing the better response to continue with.

### Step-by-Step Sequence

1. **User opens app:** Sees agent selection panel with OpenAI (2 modes) and ElevenLabs options
2. **User clicks "Start":** App requests microphone permission, establishes WebSocket connections
3. **User speaks:** Browser captures audio, streams to selected agent(s) via backend
4. **Agent responds:** Audio response streams back, plays through speakers
5. **User hot-swaps:** Clicks different agent while conversation is active; seamless transition
6. **User enables dual-mode:** Both agents now receive audio, both respond with indicators
7. **User picks response:** Clicks on preferred agent's response to continue conversation with them
8. **User ends conversation:** Connections close gracefully, conversation summary shown

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BROWSER (React)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐    ┌───────────────────┐    ┌──────────────────────────┐ │
│  │   Mic Input  │───▶│  Audio Processor  │───▶│     WebSocket Client     │ │
│  │  (MediaStream)    │  (PCM16 @ 24kHz)  │    │   (to Express backend)   │ │
│  └──────────────┘    └───────────────────┘    └────────────┬─────────────┘ │
│                                                             │               │
│  ┌──────────────┐    ┌───────────────────┐                 │               │
│  │   Speaker    │◀───│  Audio Playback   │◀────────────────┤               │
│  │   Output     │    │  (Web Audio API)  │                 │               │
│  └──────────────┘    └───────────────────┘                 │               │
│                                                             │               │
│  ┌──────────────────────────────────────────────────────┐  │               │
│  │                    UI Components                      │  │               │
│  │  • Agent Cards (OpenAI V2V, OpenAI STT, ElevenLabs)  │  │               │
│  │  • Active Speaker Indicator                           │  │               │
│  │  • Hot-Swap Controls                                  │  │               │
│  │  • Dual-Mode Toggle                                   │  │               │
│  │  • Transcript Display                                 │  │               │
│  └──────────────────────────────────────────────────────┘  │               │
└─────────────────────────────────────────────────────────────┼───────────────┘
                                                              │
                                                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXPRESS BACKEND (Node.js)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌──────────────────────────────────────────────┐   │
│  │  WebSocket      │    │              Agent Router                     │   │
│  │  Server         │───▶│  • Routes audio to active agent(s)           │   │
│  │  (ws @ 3002)    │    │  • Handles hot-swap logic                    │   │
│  └─────────────────┘    │  • Manages dual-agent mode                   │   │
│                         └────────────┬──────────────────┬──────────────┘   │
│                                      │                  │                   │
│  ┌───────────────────────────────────┼──────────────────┼───────────────┐  │
│  │                                   ▼                  ▼                │  │
│  │  ┌─────────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │  │
│  │  │  OpenAI V2V Agent   │  │ OpenAI STT Agent│  │ ElevenLabs Agent│   │  │
│  │  │  (Realtime API WS)  │  │ (REST APIs)     │  │ (Convai API)    │   │  │
│  │  │  ─────────────────  │  │ ───────────────  │  │ ───────────────  │   │  │
│  │  │  • PCM16 audio in   │  │ • Whisper STT   │  │ • WS connection │   │  │
│  │  │  • PCM16 audio out  │  │ • GPT-4 chat    │  │ • Audio in/out  │   │  │
│  │  │  • Server VAD       │  │ • TTS synthesis │  │ • Agent config  │   │  │
│  │  └──────────┬──────────┘  └────────┬────────┘  └────────┬────────┘   │  │
│  │             │                      │                    │            │  │
│  └─────────────┼──────────────────────┼────────────────────┼────────────┘  │
│                │                      │                    │               │
└────────────────┼──────────────────────┼────────────────────┼───────────────┘
                 │                      │                    │
                 ▼                      ▼                    ▼
┌────────────────────────┐  ┌────────────────────┐  ┌────────────────────────┐
│    OpenAI Realtime     │  │    OpenAI APIs     │  │   ElevenLabs APIs      │
│    WebSocket API       │  │    (REST)          │  │   (Conversational AI)  │
│  wss://api.openai.com  │  │  api.openai.com    │  │   api.elevenlabs.io    │
│  /v1/realtime          │  │  /v1/audio/*       │  │   /v1/convai/*         │
└────────────────────────┘  └────────────────────┘  └────────────────────────┘
```

### Components Identified from Flow

- **Audio Processor (Frontend):** Captures microphone, converts to PCM16 @ 24kHz, handles playback
- **WebSocket Client (Frontend):** Manages connection to backend, sends/receives audio chunks
- **UI Components (Frontend):** Agent cards, controls, transcripts, visual feedback
- **WebSocket Server (Backend):** Accepts client connections, manages sessions
- **Agent Router (Backend):** Routes audio to correct agent(s), handles mode switching
- **OpenAI V2V Agent (Backend):** Manages OpenAI Realtime API WebSocket connection
- **OpenAI STT Agent (Backend):** Orchestrates Whisper → GPT-4 → TTS pipeline
- **ElevenLabs Agent (Backend):** Manages ElevenLabs Conversational AI connection

## Proposed Solution

### High-Level Approach

The application uses a **backend proxy architecture** where the Express server mediates all connections to AI providers. This approach:

1. **Keeps API keys secure** on the server
2. **Enables hot-swapping** by routing audio to different agents without reconnecting the client
3. **Supports dual-agent mode** by duplicating audio streams to multiple agents
4. **Simplifies frontend** which only needs one WebSocket connection

The frontend captures audio using the Web Audio API, converts it to PCM16 format at 24kHz (required by OpenAI), and streams it over a WebSocket to the backend. The backend routes this audio to the active agent(s) and streams responses back.

For the OpenAI STT-LLM-TTS mode, the backend buffers audio chunks, sends them to Whisper for transcription, passes the text to GPT-4, and synthesizes the response using OpenAI TTS.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React + Vite)                     │
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │
│  │  AgentPanel │  │  AudioCtrl  │  │ Transcript  │  │  Controls │  │
│  │  (3 cards)  │  │  (mic/spkr) │  │  (history)  │  │  (swap)   │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘  │
│         │                │                │               │         │
│         └────────────────┼────────────────┼───────────────┘         │
│                          │                │                         │
│                   ┌──────┴────────────────┴──────┐                  │
│                   │     useVoiceChat Hook        │                  │
│                   │  (audio capture, WS, state)  │                  │
│                   └──────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ WebSocket (binary audio + JSON control)
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     BACKEND (Express + TypeScript)                  │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                    Session Manager                          │    │
│  │  • Client sessions (WebSocket connections)                  │    │
│  │  • Agent connections per session                            │    │
│  │  • Mode state (single/dual, active agent)                   │    │
│  └────────────────────────────────────────────────────────────┘    │
│                          │                                          │
│         ┌────────────────┼────────────────┐                        │
│         ▼                ▼                ▼                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │  OpenAI V2V │  │ OpenAI STT  │  │ ElevenLabs  │                 │
│  │   Adapter   │  │   Adapter   │  │   Adapter   │                 │
│  └─────────────┘  └─────────────┘  └─────────────┘                 │
└─────────────────────────────────────────────────────────────────────┘
```

## Design Considerations

### External API Integration

#### OpenAI Realtime API
- **Authentication**: Bearer token in WebSocket connection header
- **Rate Limits**: Standard OpenAI rate limits apply
- **Audio Format**: PCM16 at 24000 Hz, base64 encoded for WebSocket
- **Error Handling**: Reconnect with exponential backoff on disconnect
- **Voices**: alloy, echo, fable, onyx, nova, shimmer (use 'alloy' as default)

#### OpenAI STT-LLM-TTS Pipeline
- **STT (Whisper)**: POST /v1/audio/transcriptions with audio file
- **LLM (GPT-4)**: POST /v1/chat/completions
- **TTS**: POST /v1/audio/speech with mp3 output
- **Latency**: Higher than V2V due to sequential API calls

#### ElevenLabs Conversational AI
- **Authentication**: xi-api-key header
- **Agent Creation**: Need to create agent first via /v1/convai/agents
- **Conversation**: WebSocket-based conversation session
- **Voices**: 22 available voices, configurable per agent
- **Rate Limits**: Based on subscription tier

### 1. Audio Format & Processing

**Context:** Different APIs have different audio format requirements.

**Options:**
- **Option A:** Convert audio in frontend for each provider
  - Pros: Less backend processing
  - Cons: Complex frontend, exposes provider details
- **Option B:** Standardize on PCM16 @ 24kHz, convert in backend as needed
  - Pros: Simple frontend, flexible backend, matches OpenAI's format
  - Cons: Some backend processing overhead

**Recommendation:** Option B - Standardize on PCM16 @ 24kHz. This is OpenAI's native format and can be converted for ElevenLabs as needed. The frontend stays simple.

### 2. Hot-Swap Implementation

**Context:** Users need to switch between agents without interrupting the conversation flow.

**Options:**
- **Option A:** Disconnect and reconnect on swap
  - Pros: Clean state
  - Cons: Latency, loses context
- **Option B:** Maintain all agent connections, route audio dynamically
  - Pros: Instant swap, can preserve context
  - Cons: More resources, complexity
- **Option C:** Lazy connection - connect to agents on first use, keep alive
  - Pros: Balance of resource usage and speed
  - Cons: First swap has latency

**Recommendation:** Option C - Lazy connections with keep-alive. Connect to agents on demand, maintain connections for duration of session. This provides fast swaps after initial connection.

### 3. Dual-Agent Mode Response Handling

**Context:** When both agents respond, user needs to pick one to continue with.

**Options:**
- **Option A:** Play both responses simultaneously (split audio)
  - Pros: Immediate comparison
  - Cons: Confusing, hard to understand both
- **Option B:** Queue responses, play sequentially
  - Pros: Clear comparison
  - Cons: Slower, conversation feels unnatural
- **Option C:** Play primary agent, show secondary as option
  - Pros: Natural flow with comparison option
  - Cons: May miss secondary response

**Recommendation:** Option B modified - Both agents process simultaneously, but UI shows both responses as cards. User can play either on demand, then click to "continue with" one agent. Subsequent user speech only goes to selected agent until dual-mode is re-enabled.

## Detailed Design

### Data Model

```typescript
// Session state managed in backend memory (no database needed for MVP)

interface Session {
  id: string;
  clientWs: WebSocket;
  mode: 'single' | 'dual';
  activeAgents: AgentType[];
  primaryAgent: AgentType;
  agentConnections: Map<AgentType, AgentConnection>;
  conversationHistory: ConversationItem[];
  createdAt: Date;
}

interface AgentConnection {
  type: AgentType;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  ws?: WebSocket; // For V2V and ElevenLabs
  lastActivity: Date;
}

interface ConversationItem {
  id: string;
  role: 'user' | 'assistant';
  agent?: AgentType;
  content: string; // Transcript
  audioUrl?: string; // Optional playback
  timestamp: Date;
}

type AgentType = 'openai-v2v' | 'openai-stt' | 'elevenlabs';
```

### API Contracts (WebSocket Messages)

#### Client → Server Messages

```typescript
// Control messages (JSON)
interface ControlMessage {
  type: 'control';
  action: 'start' | 'stop' | 'swap' | 'select' | 'toggle-dual';
  payload?: {
    agent?: AgentType;        // For swap/select
    enabled?: boolean;        // For toggle-dual
  };
}

// Audio message (Binary)
// Raw PCM16 audio data, chunked at ~100ms intervals
```

#### Server → Client Messages

```typescript
// Status update
interface StatusMessage {
  type: 'status';
  session: {
    mode: 'single' | 'dual';
    activeAgents: AgentType[];
    primaryAgent: AgentType;
    agentStatuses: Record<AgentType, 'disconnected' | 'connecting' | 'connected' | 'error'>;
  };
}

// Transcript update
interface TranscriptMessage {
  type: 'transcript';
  role: 'user' | 'assistant';
  agent?: AgentType;
  text: string;
  isFinal: boolean;
}

// Audio response (Binary with header)
// First 20 bytes: JSON header with agent type
// Remaining: PCM16 audio data

// Error message
interface ErrorMessage {
  type: 'error';
  code: string;
  message: string;
  agent?: AgentType;
}
```

### User Interface Design

#### Main Layout
```
┌──────────────────────────────────────────────────────────────────┐
│  🎙️ Voice Chat                              [Dual Mode: OFF] 🔘  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐    │
│  │  OpenAI V2V     │ │  OpenAI STT     │ │  ElevenLabs     │    │
│  │  ─────────────  │ │  ─────────────  │ │  ─────────────  │    │
│  │  🟢 Connected   │ │  ⚪ Ready       │ │  ⚪ Ready       │    │
│  │                 │ │                 │ │                 │    │
│  │  Voice: Alloy   │ │  Model: GPT-4   │ │  Voice: Rachel  │    │
│  │                 │ │  Voice: Nova    │ │                 │    │
│  │  [▶ ACTIVE]     │ │  [ SELECT ]     │ │  [ SELECT ]     │    │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘    │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│  Conversation                                                    │
│  ─────────────────────────────────────────────────────────────  │
│  You: Hello, how are you today?                                  │
│  OpenAI V2V: I'm doing great! How can I help you?               │
│  You: Tell me a joke                                             │
│  OpenAI V2V: Why did the developer go broke? Because...         │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│           ┌────────────────────────────────────┐                 │
│           │  🎤  Hold to Talk  /  Push to Talk │                 │
│           │     ◉ ════════════════════ ◉       │                 │
│           │         [  🔴 RECORDING  ]         │                 │
│           └────────────────────────────────────┘                 │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

#### Dual Mode UI (when both agents respond)
```
┌──────────────────────────────────────────────────────────────────┐
│  Dual Response - Choose one to continue:                         │
├─────────────────────────────────┬────────────────────────────────┤
│  OpenAI V2V                     │  ElevenLabs                    │
│  ─────────────                  │  ───────────                   │
│  "I think the best approach    │  "Based on my analysis,        │
│   would be to start with..."   │   I'd recommend..."            │
│                                 │                                │
│  [▶ Play] [✓ Continue with]    │  [▶ Play] [✓ Continue with]   │
└─────────────────────────────────┴────────────────────────────────┘
```

## Testing Strategy

- **Unit Tests**: Audio processing utilities, message serialization, state management
- **Integration Tests**: WebSocket connection handling, agent adapter communication
- **E2E Tests (Playwright)**: 
  - Start conversation with each agent type
  - Hot-swap between agents mid-conversation
  - Enable/disable dual mode
  - Play back agent responses

## Open Questions

1. **Should we persist conversation history?** For MVP, keeping in memory is fine. Can add persistence later.
2. **How to handle agent-specific voice selection?** Each agent card can have a voice selector dropdown.
3. **Should dual mode responses be time-limited?** Could timeout if user doesn't select within 30 seconds.

---

*This design provides the foundation for the voice chat application. Implementation will proceed in milestones, starting with project setup and UI shell.*

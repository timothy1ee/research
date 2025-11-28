# Voice Chat Core - Implementation Milestones

**References:** `001_voice_chat_core.md`

## Overview

These milestones implement the multi-agent voice chat application in an iterative, testable manner. We build the UI first with mocks, then add backend infrastructure, then integrate real APIs one at a time.

---

## Milestone 1: Project Setup & UI Shell

**Goal:** Scaffold both frontend and backend projects, create the basic UI layout with mock data.

### Tasks

- [ ] Initialize frontend with Vite + React + TypeScript
- [ ] Initialize backend with Express + TypeScript
- [ ] Set up shared types package or types file
- [ ] Create basic UI layout:
  - [ ] Header with app title and dual-mode toggle
  - [ ] Agent cards grid (3 cards for OpenAI V2V, OpenAI STT, ElevenLabs)
  - [ ] Transcript display area
  - [ ] Recording controls (push-to-talk button)
- [ ] Style with modern dark theme (no UI library, pure CSS)
- [ ] Mock agent states and transcript data
- [ ] Set up logging infrastructure (backend)

### Test Plan

- [ ] Unit tests: Component rendering tests
- [ ] E2E tests (Playwright): App loads, all UI elements visible, toggle works

### Acceptance Criteria

- Frontend runs on localhost:5173
- Backend runs on localhost:3001
- UI shows 3 agent cards with mock status
- Dual mode toggle switches UI state
- Basic dark theme applied

---

## Milestone 2: Audio Capture & WebSocket Infrastructure

**Goal:** Implement browser audio capture, WebSocket connection between frontend and backend.

### Tasks

- [ ] Frontend: Implement audio capture with Web Audio API
  - [ ] Request microphone permission
  - [ ] Capture audio stream
  - [ ] Convert to PCM16 @ 24kHz
  - [ ] Chunk into ~100ms segments
- [ ] Frontend: Implement audio playback
  - [ ] Receive PCM16 audio chunks
  - [ ] Queue and play through Web Audio API
- [ ] Frontend: WebSocket client
  - [ ] Connect to backend on conversation start
  - [ ] Send audio chunks as binary data
  - [ ] Send control messages as JSON
  - [ ] Receive and handle server messages
- [ ] Backend: WebSocket server (ws library)
  - [ ] Accept client connections
  - [ ] Session management
  - [ ] Message routing infrastructure
  - [ ] Echo mode for testing (send audio back to client)
- [ ] Create useVoiceChat React hook for state management

### Test Plan

- [ ] Unit tests: Audio conversion functions, WebSocket message serialization
- [ ] Integration tests: WebSocket connection, echo test
- [ ] E2E tests (Playwright): Click record, speak, hear echo playback

### Acceptance Criteria

- Clicking "Record" requests mic permission and captures audio
- Audio is sent to backend via WebSocket
- Backend echoes audio back
- Audio plays through speakers
- Visual feedback shows recording/playing states

---

## Milestone 3: OpenAI Voice-to-Voice Integration

**Goal:** Integrate OpenAI Realtime API for voice-to-voice conversations.

### Tasks

- [ ] Backend: OpenAI V2V Agent adapter
  - [ ] Connect to OpenAI Realtime API via WebSocket
  - [ ] Configure session (voice, VAD settings)
  - [ ] Forward client audio to OpenAI
  - [ ] Receive and forward OpenAI audio responses
  - [ ] Handle transcripts (input and output)
  - [ ] Error handling and reconnection logic
- [ ] Frontend: Update agent card to show real status
- [ ] Frontend: Display transcripts as they arrive
- [ ] Backend: Route audio only to OpenAI V2V when selected
- [ ] Test with real conversation

### Test Plan

- [ ] Unit tests: OpenAI message parsing, session configuration
- [ ] Integration tests: Connection to OpenAI API (requires API key)
- [ ] E2E tests (Playwright): Full conversation with OpenAI V2V

### Acceptance Criteria

- Selecting OpenAI V2V and speaking triggers AI response
- AI audio response plays through speakers
- Transcripts appear for both user and AI
- Agent card shows connected status
- Errors handled gracefully with user feedback

---

## Milestone 4: OpenAI STT-LLM-TTS Integration

**Goal:** Implement the alternative OpenAI mode using separate STT, Chat, and TTS APIs.

### Tasks

- [ ] Backend: OpenAI STT Agent adapter
  - [ ] Buffer incoming audio chunks
  - [ ] Detect end of speech (silence detection)
  - [ ] Send audio to Whisper API for transcription
  - [ ] Send transcript to GPT-4 Chat API
  - [ ] Send response to TTS API for synthesis
  - [ ] Stream synthesized audio back to client
- [ ] Frontend: Handle STT-specific UI (processing indicators)
- [ ] Backend: Route audio to STT agent when selected
- [ ] Compare latency with V2V mode

### Test Plan

- [ ] Unit tests: Audio buffering, silence detection
- [ ] Integration tests: Each API call (Whisper, Chat, TTS)
- [ ] E2E tests (Playwright): Full conversation with OpenAI STT mode

### Acceptance Criteria

- Selecting OpenAI STT and speaking triggers transcription
- Transcription appears, then AI text response, then audio
- Audio response plays through speakers
- Mode is noticeably slower than V2V (expected)
- Can switch between V2V and STT modes

---

## Milestone 5: ElevenLabs Integration

**Goal:** Integrate ElevenLabs Conversational AI for voice conversations.

### Tasks

- [ ] Backend: Create ElevenLabs agent on app startup
  - [ ] Use Conversational AI API to create agent
  - [ ] Configure voice and prompt
  - [ ] Store agent ID for sessions
- [ ] Backend: ElevenLabs Agent adapter
  - [ ] Connect to ElevenLabs Conversation API
  - [ ] Forward client audio
  - [ ] Receive and forward audio responses
  - [ ] Handle transcripts
- [ ] Frontend: Update ElevenLabs card to show status
- [ ] Backend: Route audio to ElevenLabs when selected
- [ ] Test with real conversation

### Test Plan

- [ ] Unit tests: ElevenLabs message handling
- [ ] Integration tests: Agent creation, conversation flow
- [ ] E2E tests (Playwright): Full conversation with ElevenLabs

### Acceptance Criteria

- Selecting ElevenLabs and speaking triggers AI response
- Audio quality is good
- Transcripts appear
- Agent card shows connected status

---

## Milestone 6: Hot-Swap & Agent Selection

**Goal:** Enable seamless switching between agents during a conversation.

### Tasks

- [ ] Backend: Implement lazy agent connections
  - [ ] Connect to agent only when first selected
  - [ ] Keep connection alive for session duration
  - [ ] Clean up connections on session end
- [ ] Backend: Implement swap logic
  - [ ] On swap, redirect audio stream to new agent
  - [ ] Optionally pass context/history to new agent
- [ ] Frontend: Swap UI
  - [ ] Click agent card to select/swap
  - [ ] Visual indication of active agent
  - [ ] Smooth transition feedback
- [ ] Test rapid swapping between agents

### Test Plan

- [ ] Unit tests: Session state management
- [ ] Integration tests: Swap between connected agents
- [ ] E2E tests (Playwright): Start with one agent, swap to another mid-conversation

### Acceptance Criteria

- Can start conversation with any agent
- Can swap to different agent by clicking card
- Swap is fast (< 500ms perceptible delay)
- Conversation continues naturally after swap
- Previous agent stays connected for quick swap back

---

## Milestone 7: Dual-Agent Mode

**Goal:** Enable both agents to listen and respond simultaneously.

### Tasks

- [ ] Backend: Dual mode audio routing
  - [ ] Duplicate audio stream to both active agents
  - [ ] Collect responses from both
  - [ ] Mark responses with agent source
- [ ] Frontend: Dual mode UI
  - [ ] Toggle dual mode on/off
  - [ ] Show both responses in comparison view
  - [ ] Allow playing each response
  - [ ] "Continue with" button for each agent
- [ ] Backend: Selection logic
  - [ ] When user selects an agent's response
  - [ ] Switch to single mode with selected agent
  - [ ] Optionally mute the other agent's response
- [ ] Handle edge cases (one agent fails, timing differences)

### Test Plan

- [ ] Unit tests: Dual mode state management
- [ ] Integration tests: Both agents receive same audio
- [ ] E2E tests (Playwright): Enable dual mode, speak, see both responses, select one

### Acceptance Criteria

- Dual mode toggle works
- Both agents respond to same user input
- Both responses displayed side by side
- Can play either response on demand
- Selecting one continues with that agent
- Can re-enable dual mode for next question

---

## Milestone 8: Polish & Production Readiness

**Goal:** Final polish, error handling, performance optimization.

### Tasks

- [ ] Improve error handling and user feedback
- [ ] Add connection retry logic with exponential backoff
- [ ] Add loading states and animations
- [ ] Optimize audio latency
- [ ] Add voice selection UI for each agent
- [ ] Add keyboard shortcuts (space to record, etc.)
- [ ] Add session cleanup and timeout handling
- [ ] Review and reduce log verbosity
- [ ] Performance testing with extended conversations

### Test Plan

- [ ] E2E tests: Error scenarios (API down, network issues)
- [ ] Performance tests: Long conversations, memory usage
- [ ] Accessibility tests: Keyboard navigation, screen reader

### Acceptance Criteria

- App handles errors gracefully with user feedback
- No memory leaks in extended use
- Keyboard shortcuts work
- Voice selection available per agent
- Production-ready code quality

---

## Completion Checklist

After each milestone:
- [ ] All tests pass
- [ ] Logs reviewed and reduced
- [ ] No blocking issues

**Independence reminder:** After completing each milestone, immediately proceed to the next without stopping for approval.

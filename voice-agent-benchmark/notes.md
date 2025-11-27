# Voice Agent Benchmark App - Research Notes

## Project Overview
Building a web application for benchmarking and comparing conversational voice agents from multiple providers. Core UX is sequential A/B testing where user speaks once, then selects from up to 4 configured agents to hear each respond to the same input.

## Research Phase
Starting research on voice providers and their APIs.

---

## Voice Providers to Research

1. **OpenAI Realtime API** - WebSocket-based, function calling support
2. **ElevenLabs Conversational AI** - WebSocket-based, high quality voices
3. **Google Cloud Text-to-Speech** - REST-based TTS
4. **PlayHT** - REST and streaming, emotion controls
5. **Deepgram** - Known for STT, has TTS (Aura)
6. **Cartesia** - Sonic model, very fast WebSocket streaming

---

## Research Log

### 2025-11-27 - Initial Research Complete

#### OpenAI Realtime API

**Connection:**
- WebSocket endpoint: `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview`
- Also supports WebRTC for lower latency client-side applications
- Authentication via Authorization header with API key

**Models:**
- `gpt-4o-realtime-preview` (2024-12-17)
- `gpt-4o-mini-realtime-preview` (2024-12-17)
- `gpt-realtime` (2025-08-28)
- `gpt-realtime-mini` (2025-10-06)

**Voices (11 total):**
- Original: alloy, echo, fable, onyx, nova, shimmer
- New (Oct 2024): ash, ballad, coral, sage, verse
- Newer: marin, cedar

**Voice Characteristics:**
- Alloy: Neutral and balanced
- Ash: Clear and precise
- Ballad: Melodic and smooth
- Coral: Warm and friendly
- Echo: Resonant and deep
- Sage: Calm and thoughtful
- Shimmer: Bright and energetic
- Verse: Versatile and expressive

**Key Events:**
- Client events (9): session.update, input_audio_buffer.append, input_audio_buffer.commit, response.create, etc.
- Server events (28): session.created, session.updated, audio.delta, response.done, etc.

**Audio Format:**
- 16-bit, 24kHz uncompressed audio
- G.711 compressed audio supported
- Base64-encoded chunks

**Turn Detection:**
- `server_vad`: Automatic chunking based on silence
- `semantic_vad`: Chunks when model believes utterance complete
- `none`: Manual control

**Important Note:** Voice cannot be changed mid-session after first audio response.

---

#### ElevenLabs Conversational AI

**Connection:**
- WebSocket endpoint: `wss://api.elevenlabs.io/v1/convai/conversation?agent_id={agent_id}`
- Also has TTS WebSocket: `wss://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream-input?model_id={model}`
- Multi-context WebSocket for voice agent scenarios

**Models:**
- `eleven_flash_v2_5`: Ultra-low-latency (<75ms), 0.5 credits/char
- `eleven_turbo_v2_5`: Low latency, 32 languages, 0.5 credits/char
- `eleven_turbo_v2`: English-only, low latency
- `eleven_multilingual_v2`: Highest quality, 29 languages, 1 credit/char (best for voiceovers/audiobooks)

**Voices:**
- Extensive voice library (1000s of voices)
- Voice cloning supported
- Can list via API: `client.voices.search()`

**Character Limits:**
- 10,000 characters for multilingual v2

**Security Notes:**
- Never expose API key client-side
- Use signed URLs for private agents
- Implement rate limiting

**Best Practices:**
- Use Web Audio API for playback
- Handle audio queuing to prevent overlapping
- Implement retry logic and visual indicators
- Add jitter buffer for network variations

---

#### Google Cloud Text-to-Speech

**Connection:**
- REST API: `https://texttospeech.googleapis.com/v1/text:synthesize`
- Discovery docs at: `https://texttospeech.googleapis.com/$discovery/rest?version=v1`

**Voice Types:**
- **Standard**: Signal processing algorithms
- **WaveNet**: ML models trained on human audio samples
- **Neural2**: Latest generation, even more natural
- **Studio**: Highest quality, limited availability

**Voice Naming Convention:**
- Format: `{language}-{region}-{type}-{letter}`
- Example: `en-US-Neural2-A`, `en-GB-Wavenet-B`

**Languages:**
- 220+ voices across 40+ languages

**Pricing:**
- WaveNet: First 1M characters free/month
- Standard: First 4M characters free/month

**Note:** REST-only, no streaming WebSocket. Need to request full audio file then play.

---

#### PlayHT

**Connection:**
- HTTP streaming: `POST https://api.play.ht/api/v2/tts/stream`
- WebSocket: Available for Play3.0-mini and PlayDialog
- gRPC: Available for PlayHT2.0-turbo

**Models:**
- `Play3.0-mini`: Latest, realtime, <200ms latency, 48kHz, 36 languages
- `PlayDialog`: Advanced, multi-voice dialogue generation
- `PlayHT2.0-turbo`: Older, gRPC streaming

**Key Features of Play3.0-mini:**
- Reduced hallucinations
- Better number/alphanumeric accuracy
- 20k character limit (up from 2k)
- 36 language support

**WebSocket Notes:**
- Connection duration: 1 hour max
- Commands sent as JSON in snake_case

**SDKs:**
- Python: `pyht`
- Node.js: `playht-nodejs-sdk`

---

#### Deepgram Aura TTS

**Connection:**
- REST: `POST https://api.deepgram.com/v1/speak`
- WebSocket: `wss://api.deepgram.com/v1/speak`

**Models:**
- Aura-2: Latest, 40+ English voices, localized accents
- Default voice: `aura-asteria-en`

**Voice Naming:**
- Format: `[modelname]-[voicename]-[language]`
- Example: `aura-asteria-en`, `aura-luna-en`

**Languages:**
- English (US, UK, Australian, Irish, Filipino accents)
- Spanish (Mexican, Peninsular, Colombian, Latin American)

**Performance:**
- Sub-200ms latency
- Handles 1000s of concurrent requests

**Pricing:**
- $0.030 per 1,000 characters

**Output:**
- Default: MP3 audio streaming
- Can play as soon as first byte received

---

#### Cartesia Sonic

**Connection:**
- WebSocket: `wss://api.cartesia.ai/tts/websocket`
- API versions: 2024-06-10, 2024-11-13, 2025-04-16

**Models:**
- Sonic-3: Latest, laughter and emotion support, 40+ languages

**Key Features:**
- Real-time streaming
- Word-level timestamps
- Audio context management
- Speed and emotion controls
- On-device support (Sonic On-Device, private beta)

**Best Practices:**
- Set up WebSocket before first generation
- Include proper punctuation for better prosody
- Each conversation turn = new context
- Contexts timeout after 20 seconds (configurable to 180s)

**SDKs:**
- Python: `cartesia`
- JavaScript: `@cartesia/cartesia-js`
- React hook: `useTTS`

---

## Pricing Comparison (TTS)

| Provider | Cost per 1K chars | Notes |
|----------|-------------------|-------|
| Deepgram Aura-2 | $0.030 | Lowest cost |
| Cartesia Sonic | $0.038 | Very fast |
| ElevenLabs Flash | $0.050 | Ultra-low latency |
| OpenAI TTS | $0.015 | Higher for realtime |
| PlayHT | $0.015 | Play3.0-mini |
| Google Cloud | Free tier, then varies | WaveNet/Neural2 |

---

## Architecture Decisions

### MVP Provider Selection

For the initial MVP, I recommend focusing on:

1. **OpenAI Realtime API** - Full conversational AI with built-in LLM
2. **ElevenLabs** - High quality voices, good WebSocket support
3. **Deepgram** - Fast and affordable TTS (plus STT)
4. **Cartesia** - Ultra-fast, good for latency comparison

### Key Technical Considerations

1. **WebSocket vs REST:**
   - OpenAI, ElevenLabs, Deepgram, Cartesia all support WebSocket
   - Google Cloud is REST-only (need full audio before playback)
   - For benchmarking, prefer WebSocket for true latency measurement

2. **Audio Formats:**
   - OpenAI: 16-bit 24kHz PCM, G.711
   - ElevenLabs: Various (MP3, PCM, etc.)
   - Deepgram: MP3 streaming
   - Cartesia: PCM/WAV streaming

   Need audio format normalization layer for fair comparison.

3. **Conversation Context:**
   - OpenAI Realtime maintains full conversation internally
   - Others need LLM layer (GPT-4, Claude, etc.) + TTS
   - Need to separate concerns for fair comparison

4. **Latency Metrics:**
   - Time to First Byte (TTFB)
   - Total response time
   - Audio duration
   - Processing overhead

5. **User Input Handling:**
   - Browser MediaRecorder API for audio capture
   - Web Speech API for transcription (or Whisper/Deepgram STT)
   - Need unified input format for all agents

---

## Implementation Log

### 2025-11-27 - Implementation Complete

#### Project Setup
- Created Vite + React + TypeScript project
- Installed Tailwind CSS v4 with @tailwindcss/vite plugin
- Added Zustand for state management
- Added lucide-react for icons

#### Provider Adapters Implemented
1. **OpenAIProvider** - Full WebSocket implementation with:
   - Session management
   - Audio buffer handling (PCM 16-bit 24kHz)
   - WAV blob creation from PCM data
   - Turn detection support

2. **ElevenLabsProvider** - REST API with streaming:
   - Voice listing API
   - TTS synthesis with configurable models
   - Streaming support via fetch ReadableStream

3. **DeepgramProvider** - REST and WebSocket:
   - Aura TTS integration
   - Multiple voice/accent support

4. **CartesiaProvider** - WebSocket streaming:
   - Real-time audio streaming
   - Context management

5. **MockProvider** - For testing without API keys:
   - Generates synthetic WAV audio
   - Uses browser Web Speech API when available
   - Simulates latency metrics

#### UI Components Built
- **AgentCard** - Individual agent display with:
  - Status indicators (idle, ready, processing, speaking, complete, error)
  - Audio visualization (Web Audio API FFT analyzer)
  - Playback controls
  - Latency metrics display
  - Rating system (thumbs up/down)

- **AgentGrid** - 2x2 responsive grid layout

- **InputControls** - User input handling:
  - Text input with Enter to send
  - Push-to-talk microphone (spacebar or click)
  - Audio level visualization
  - Turn navigation (Next Turn button)

- **ConfigPanel** - Agent configuration modal:
  - Provider selection
  - Voice browser with preview
  - Model selection
  - API key management (localStorage)

- **Header** - Session controls:
  - System prompt editor
  - Mock/Live mode toggle
  - Session reset
  - Dark mode toggle

#### State Management (Zustand)
- Session state with persistence
- Agent configuration and history
- Turn-based conversation flow
- Provider instance management

#### Features Implemented
- [x] 4-slot agent grid
- [x] Mock mode for testing without API keys
- [x] Audio recording (MediaRecorder API)
- [x] Audio playback with waveform visualization
- [x] Latency metrics (TTFB, total time, audio duration)
- [x] Cost estimation per response
- [x] Thumbs up/down rating system
- [x] Configurable voices and models per agent
- [x] Shared system prompt
- [x] Turn-based conversation flow
- [x] Session persistence (localStorage)

#### Build and Test
- TypeScript strict mode compliance
- Production build succeeds
- Development server runs at localhost:5173

#### Files Created
```
app/
├── src/
│   ├── types/index.ts          # TypeScript interfaces
│   ├── providers/
│   │   ├── BaseProvider.ts     # Abstract base class
│   │   ├── OpenAIProvider.ts   # OpenAI Realtime
│   │   ├── ElevenLabsProvider.ts
│   │   ├── DeepgramProvider.ts
│   │   ├── CartesiaProvider.ts
│   │   ├── MockProvider.ts     # Testing provider
│   │   └── index.ts            # Provider registry
│   ├── store/index.ts          # Zustand store
│   ├── components/
│   │   ├── AgentCard.tsx
│   │   ├── AgentGrid.tsx
│   │   ├── ConfigPanel.tsx
│   │   ├── Header.tsx
│   │   ├── InputControls.tsx
│   │   └── index.ts
│   ├── App.tsx
│   └── index.css               # Tailwind imports
├── vite.config.ts
└── package.json
```

#### Known Limitations
- Real API providers require API keys (use Mock mode for testing)
- OpenAI Realtime requires WebSocket authorization headers (needs proxy for browser use - see below)
- Voice preview in config panel is placeholder
- No session history export (stretch goal)

#### Future Improvements
- Implement LLM layer for TTS-only providers
- Add session export to JSON
- Add voice preview functionality
- Add PlayHT and Google Cloud providers
- Add cost tracking dashboard

---

### 2025-11-27 - Bug Fixes

#### Issue 1: Audio Recording Not Submitting
**Problem:** When recording with spacebar or mic button, the turn wasn't completed after release.

**Root Cause:** The audio was being recorded, but there was no transcription happening. The app expected text input to submit.

**Solution:** Added Web Speech API integration to `InputControls.tsx`:
- Created TypeScript interfaces for SpeechRecognition API
- Start speech recognition when recording begins
- Show interim transcription results in real-time in the text input
- Auto-submit the transcribed text when recording stops

**Key Changes:**
- `InputControls.tsx`: Added SpeechRecognition interfaces, `recognitionRef`, `transcriptRef`, `isTranscribing` state
- Recording now simultaneously captures audio AND transcribes speech
- After releasing mic, waits 500ms for final transcript, then auto-submits

#### Issue 2: OpenAI Provider Hanging Forever
**Problem:** Clicking on OpenAI agent in live mode caused it to stay in "Processing..." forever.

**Root Cause:** Browser WebSocket connections cannot send Authorization headers. OpenAI Realtime API requires authentication that browsers can't provide directly without a proxy.

**Solution:** Added proper error handling and timeout:
- Added 5-second connection timeout
- Clear error messages explaining the browser limitation
- Suggests using Mock mode or setting up a backend proxy
- Error message is now displayed in the agent card

**Key Changes:**
- `OpenAIProvider.ts`: Added connection timeout, better error messages
- `types/index.ts`: Added `errorMessage?: string` to AgentSlot
- `store/index.ts`: Updated `setAgentStatus` to accept optional error message
- `AgentCard.tsx`: Display error message when agent is in error state

#### Browser WebSocket Authentication Limitation
For OpenAI Realtime API to work in a browser, you need one of:
1. **Backend Proxy Server**: WebSocket proxy that adds Authorization header
2. **Ephemeral Tokens**: Backend generates short-lived tokens for client use
3. **WebRTC**: OpenAI's WebRTC implementation (different connection method)

For now, **use Mock mode** for browser testing without API infrastructure.

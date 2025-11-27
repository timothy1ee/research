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

## Next Steps

1. Set up React + TypeScript project with Vite
2. Create provider adapter interface
3. Implement OpenAI Realtime adapter first
4. Implement ElevenLabs adapter
5. Build 2x2 agent grid UI
6. Add audio recording and playback
7. Add latency metrics display
8. Add rating system

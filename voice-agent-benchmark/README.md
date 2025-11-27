# Voice Agent Benchmarking App - Research Report

## Executive Summary

This document presents research findings for building a voice agent benchmarking application that allows side-by-side comparison of multiple voice AI providers. The application enables users to speak once and then trigger responses from up to 4 configured voice agents, comparing quality, latency, and cost.

## Voice Provider Research

### Provider Overview

| Provider | Protocol | Latency | Best For | Pricing |
|----------|----------|---------|----------|---------|
| **OpenAI Realtime** | WebSocket/WebRTC | Low | Full conversational AI | ~$0.06/min audio |
| **ElevenLabs** | WebSocket | <75ms (Flash) | High-quality voices | $0.05/1K chars |
| **Deepgram Aura** | WebSocket/REST | <200ms | Cost-effective TTS | $0.03/1K chars |
| **Cartesia Sonic** | WebSocket | Ultra-low | Speed-critical apps | $0.038/1K chars |
| **PlayHT** | WebSocket/HTTP | <200ms | Emotion controls | $0.015/1K chars |
| **Google Cloud TTS** | REST only | Higher | Wide language support | Free tier available |

---

## Detailed Provider Analysis

### 1. OpenAI Realtime API

**Unique Position:** Only provider offering integrated LLM + voice in a single API.

**Connection:**
```
WebSocket: wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview
WebRTC: Available for lower-latency client applications
```

**Models:**
- `gpt-4o-realtime-preview` - Full capability
- `gpt-4o-mini-realtime-preview` - Faster, cheaper
- `gpt-realtime` / `gpt-realtime-mini` - Latest versions

**Available Voices (11):**
| Voice | Characteristic |
|-------|---------------|
| alloy | Neutral and balanced |
| ash | Clear and precise |
| ballad | Melodic and smooth |
| coral | Warm and friendly |
| echo | Resonant and deep |
| fable | Narrative style |
| nova | Energetic |
| onyx | Deep and authoritative |
| sage | Calm and thoughtful |
| shimmer | Bright and energetic |
| verse | Versatile and expressive |

**Event Protocol:**
- 9 client events: `session.update`, `input_audio_buffer.append`, `input_audio_buffer.commit`, `response.create`, etc.
- 28 server events: `session.created`, `audio.delta`, `response.done`, etc.

**Audio Specifications:**
- Format: 16-bit PCM, 24kHz
- Also supports G.711 compressed
- Base64-encoded chunks in JSON messages

**Turn Detection Options:**
- `server_vad`: Automatic silence detection
- `semantic_vad`: Detects utterance completion semantically
- `none`: Manual control via events

**Key Limitation:** Voice cannot be changed after first audio response in a session.

**Documentation:** [OpenAI Realtime API Guide](https://platform.openai.com/docs/guides/realtime)

---

### 2. ElevenLabs

**Unique Position:** Highest quality voices with extensive voice library and cloning.

**Connection:**
```
Conversational AI: wss://api.elevenlabs.io/v1/convai/conversation?agent_id={agent_id}
TTS Streaming: wss://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream-input?model_id={model}
```

**Models:**
| Model ID | Latency | Languages | Cost | Best For |
|----------|---------|-----------|------|----------|
| `eleven_flash_v2_5` | <75ms | 32 | 0.5x | Real-time apps |
| `eleven_turbo_v2_5` | Low | 32 | 0.5x | Conversational AI |
| `eleven_turbo_v2` | Low | English | 0.5x | English-only speed |
| `eleven_multilingual_v2` | Standard | 29 | 1x | Quality-first |

**Voices:**
- 1000+ pre-made voices in library
- Voice cloning available (Professional tier+)
- API endpoint: `GET /v1/voices` to list available voices

**Best Practices:**
- Use signed URLs for private agents (never expose API key client-side)
- Implement audio queuing to prevent overlapping chunks
- Add jitter buffer for network variations
- Context timeout: 20-180 seconds configurable

**Documentation:** [ElevenLabs WebSocket Docs](https://elevenlabs.io/docs/conversational-ai/libraries/web-sockets)

---

### 3. Deepgram Aura

**Unique Position:** Excellent STT + TTS combo, very cost-effective.

**Connection:**
```
REST: POST https://api.deepgram.com/v1/speak
WebSocket: wss://api.deepgram.com/v1/speak
```

**Models:**
- **Aura-2**: Latest generation, 40+ English voices with regional accents
- Default: `aura-asteria-en`

**Voice Naming Convention:**
```
Format: [model]-[voice]-[language]
Examples: aura-asteria-en, aura-luna-en, aura-orion-en
```

**Supported Accents:**
- English: US, UK, Australian, Irish, Filipino
- Spanish: Mexican, Peninsular, Colombian, Latin American

**Performance:**
- Sub-200ms latency
- Handles thousands of concurrent requests
- Streaming: Play audio as first bytes arrive

**Output Formats:** MP3 (default), WAV, PCM

**Pricing:** $0.030 per 1,000 characters (one of the lowest)

**Documentation:** [Deepgram TTS Docs](https://developers.deepgram.com/docs/text-to-speech)

---

### 4. Cartesia Sonic

**Unique Position:** Ultra-fast streaming with emotion and laughter support.

**Connection:**
```
WebSocket: wss://api.cartesia.ai/tts/websocket
API Versions: 2024-06-10, 2024-11-13, 2025-04-16
```

**Model:**
- **Sonic-3**: 40+ languages, real-time streaming, emotion controls

**Key Features:**
- Word-level timestamps
- Audio context management
- Speed controls
- Emotion/laughter generation
- On-device support (private beta)

**Best Practices:**
- Pre-establish WebSocket before first generation
- Use proper punctuation for better prosody
- Each conversation turn = new context
- Contexts auto-timeout after 20 seconds

**SDKs:**
- Python: `pip install cartesia`
- JavaScript: `npm install @cartesia/cartesia-js`
- React hook: `useTTS` for easy integration

**Documentation:** [Cartesia WebSocket API](https://docs.cartesia.ai/api-reference/tts/websocket)

---

### 5. PlayHT

**Unique Position:** Multi-protocol support with dialogue generation.

**Connection:**
```
HTTP Streaming: POST https://api.play.ht/api/v2/tts/stream
WebSocket: Available for Play3.0-mini and PlayDialog
gRPC: Available for PlayHT2.0-turbo
```

**Models:**
| Model | Features | Latency |
|-------|----------|---------|
| `Play3.0-mini` | 36 languages, 48kHz, 20K char limit | <200ms |
| `PlayDialog` | Multi-voice dialogue generation | Standard |
| `PlayHT2.0-turbo` | Legacy, gRPC only | Low |

**Key Features (Play3.0-mini):**
- Reduced hallucinations on numbers/alphanumeric
- Consistent <200ms latency
- Native 48kHz sampling
- 36 language support

**WebSocket Notes:**
- Connection duration: 1 hour max
- Commands use snake_case JSON

**Documentation:** [PlayHT API Docs](https://docs.play.ht)

---

### 6. Google Cloud Text-to-Speech

**Unique Position:** Widest language support, enterprise-grade.

**Connection:**
```
REST: POST https://texttospeech.googleapis.com/v1/text:synthesize
(No WebSocket streaming available)
```

**Voice Types:**
| Type | Quality | Notes |
|------|---------|-------|
| Standard | Basic | Signal processing |
| WaveNet | High | ML-based, human-like |
| Neural2 | Higher | Latest generation |
| Studio | Highest | Limited availability |

**Voice Naming:**
```
Format: {lang}-{region}-{type}-{letter}
Examples: en-US-Neural2-A, en-GB-Wavenet-B, de-DE-Standard-A
```

**Scale:** 220+ voices across 40+ languages

**Pricing:**
- Standard: 4M chars/month free
- WaveNet: 1M chars/month free
- Then pay-as-you-go

**Limitation:** REST-only means full audio must be generated before playback - not ideal for latency benchmarking.

**Documentation:** [Google Cloud TTS](https://cloud.google.com/text-to-speech/docs)

---

## Architecture Recommendation

### Provider Adapter Pattern

```typescript
interface VoiceAgentProvider {
  id: string;
  name: string;

  // Configuration
  availableVoices(): Promise<Voice[]>;
  availableModels(): Promise<Model[]>;
  configure(config: ProviderConfig): void;

  // Core functionality
  connect(): Promise<void>;
  disconnect(): void;
  sendMessage(
    input: AudioBlob | string,
    conversationHistory: Message[]
  ): Promise<AudioResponse>;

  // Metrics
  getLatencyMetrics(): LatencyMetrics;

  // Events
  onAudioChunk: (callback: (chunk: AudioChunk) => void) => void;
  onTranscript: (callback: (text: string) => void) => void;
  onError: (callback: (error: Error) => void) => void;
}
```

### Two Architecture Approaches

**Approach A: Full Conversational (OpenAI-style)**
```
User Audio → Provider API (LLM + TTS integrated) → Audio Response
```
- Simpler integration
- Provider handles conversation state
- Only OpenAI fully supports this

**Approach B: Modular (LLM + TTS separate)**
```
User Audio → STT → LLM API → Text Response → TTS API → Audio
```
- More flexible
- Can mix/match LLM and voice providers
- Better for fair voice quality comparison
- More latency from multiple hops

### Recommended Hybrid Approach

For the benchmarking app, use **Approach B** as the primary architecture:

1. **Single STT provider** (Deepgram or browser Web Speech API) for user input
2. **Single LLM** (GPT-4, Claude, etc.) generates text responses for all agents
3. **Multiple TTS providers** convert same text to speech for comparison

This ensures:
- Fair comparison (same input text to all providers)
- Isolated voice quality benchmarking
- Consistent LLM quality across tests

For OpenAI Realtime specifically, can run as a separate "full-stack" option.

---

## MVP Implementation Plan

### Phase 1: Core Infrastructure
1. React + TypeScript + Vite project setup
2. Tailwind CSS for styling
3. Zustand for state management
4. Provider adapter interface definition

### Phase 2: Provider Integrations
1. Deepgram adapter (STT + TTS)
2. ElevenLabs adapter
3. OpenAI Realtime adapter (full conversational)
4. Cartesia adapter

### Phase 3: UI Components
1. 2x2 agent grid layout
2. Agent card with status indicators
3. Audio recording interface
4. Waveform visualization
5. Latency metrics display

### Phase 4: Features
1. System prompt configuration
2. Per-agent voice/model selection
3. Rating system (thumbs up/down)
4. Session persistence

### Phase 5: Polish
1. Voice browser/preview modal
2. Cost estimation
3. Session export (JSON)
4. Dark/light theme

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Framework | React 18 | Component model, hooks |
| Language | TypeScript | Type safety |
| Bundler | Vite | Fast dev, good DX |
| Styling | Tailwind CSS | Rapid UI development |
| State | Zustand | Lightweight, simple |
| Audio | Web Audio API | Waveform viz, playback |
| Recording | MediaRecorder API | Browser-native capture |
| Storage | localStorage | API keys, preferences |
| Storage | IndexedDB | Session history |

---

## Key Considerations

### Security
- API keys stored in localStorage (warn users)
- Use signed URLs where possible (ElevenLabs)
- Never log or transmit keys to third parties
- Consider proxy server for production

### Audio Handling
- Normalize audio formats across providers
- Implement audio queue for chunk management
- Use AudioContext for consistent playback
- Handle interruptions gracefully

### Latency Measurement
- Mark timestamp at request initiation
- Track Time to First Byte (TTFB)
- Track total response completion time
- Account for audio decode time separately

### Error Handling
- Retry logic with exponential backoff
- Graceful degradation if provider fails
- Clear error messaging to users
- Connection state management

---

## Cost Estimation (Per 1000 Requests)

Assuming average response of 200 characters:

| Provider | Cost per Request | Per 1000 Requests |
|----------|------------------|-------------------|
| Deepgram | $0.006 | $6.00 |
| Cartesia | $0.0076 | $7.60 |
| ElevenLabs (Flash) | $0.01 | $10.00 |
| PlayHT | $0.003 | $3.00 |
| OpenAI Realtime | ~$0.012 | $12.00 |

---

## Sources

- [OpenAI Realtime API Documentation](https://platform.openai.com/docs/guides/realtime)
- [OpenAI Realtime WebSocket Guide](https://platform.openai.com/docs/guides/realtime-websocket)
- [ElevenLabs WebSocket Documentation](https://elevenlabs.io/docs/conversational-ai/libraries/web-sockets)
- [ElevenLabs Models](https://elevenlabs.io/docs/models)
- [Deepgram TTS Documentation](https://developers.deepgram.com/docs/text-to-speech)
- [Deepgram TTS WebSocket](https://developers.deepgram.com/docs/tts-websocket)
- [Cartesia WebSocket API](https://docs.cartesia.ai/api-reference/tts/websocket)
- [PlayHT API Reference](https://docs.play.ht/reference/api-getting-started)
- [Google Cloud TTS](https://cloud.google.com/text-to-speech/docs)
- [Voice AI Provider Comparison](https://comparevoiceai.com/providers)
- [STT/TTS Selection Guide](https://softcery.com/lab/how-to-choose-stt-tts-for-ai-voice-agents-in-2025-a-comprehensive-guide)

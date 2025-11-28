/**
 * OpenAI STT-LLM-TTS Agent
 * Uses separate STT -> GPT-4 (LLM) -> TTS pipeline
 * 
 * Optimized for low latency:
 * - Uses gpt-4o-transcribe for faster STT
 * - Streams LLM responses and chunks by sentence
 * - Uses gpt-4o-mini-tts with streaming audio output
 */

import { BaseAgent, AgentEvents, AgentConfig } from './BaseAgent.js';
import { logger } from '../utils/logger.js';

interface OpenAISTTConfig extends AgentConfig {
  voice?: 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo' | 'fable' | 'onyx' | 'nova' | 'sage' | 'shimmer' | 'verse';
  model?: string;
  sttModel?: string;
  ttsModel?: string;
}

// Sentence boundary detection regex
const SENTENCE_ENDINGS = /[.!?](?:\s|$)/;

export class OpenAISTTAgent extends BaseAgent {
  private apiKey: string;
  private sttConfig: OpenAISTTConfig;
  private audioBuffer: Buffer[] = [];
  private silenceTimeout: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private conversationHistory: { role: 'user' | 'assistant'; content: string }[] = [];

  constructor(events: AgentEvents, config: OpenAISTTConfig = {}) {
    super('openai-stt', events, config);
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.sttConfig = {
      voice: config.voice || 'nova',
      model: config.model || 'gpt-4o',
      sttModel: config.sttModel || 'gpt-4o-transcribe',  // Faster than whisper-1
      ttsModel: config.ttsModel || 'gpt-4o-mini-tts',    // Latest TTS model
      instructions: config.instructions || 'You are a helpful, friendly assistant. Keep responses concise and conversational. Use short sentences.',
    };

    if (!this.apiKey) {
      logger.error('OPENAI_STT', 'No OpenAI API key found in environment');
    }
  }

  async connect(): Promise<void> {
    if (this.status === 'connected' || this.status === 'connecting') {
      return;
    }

    this.setStatus('connecting');
    logger.info('OPENAI_STT', 'Initializing STT-LLM-TTS pipeline');

    // Test API key with a simple request
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`API key validation failed: ${response.status}`);
      }

      this.setStatus('connected');
      logger.info('OPENAI_STT', 'Pipeline ready');
    } catch (error) {
      logger.error('OPENAI_STT', 'Failed to initialize', { error: String(error) });
      this.setStatus('error');
      this.events.onError(`OpenAI STT initialization failed: ${error}`);
      throw error;
    }
  }

  disconnect(): void {
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
      this.silenceTimeout = null;
    }
    this.audioBuffer = [];
    this.setStatus('disconnected');
    logger.info('OPENAI_STT', 'Disconnected');
  }

  sendAudio(audio: ArrayBuffer): void {
    if (this.status !== 'connected') {
      logger.warn('OPENAI_STT', 'Cannot send audio - not connected');
      return;
    }

    // Buffer the audio
    this.audioBuffer.push(Buffer.from(audio));

    // Reset silence detection timeout
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
    }

    // After 1 second of no new audio, process the buffer
    this.silenceTimeout = setTimeout(() => {
      this.processAudioBuffer();
    }, 1000);
  }

  private async processAudioBuffer(): Promise<void> {
    if (this.audioBuffer.length === 0 || this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    const startTime = Date.now();
    logger.info('OPENAI_STT', 'Processing audio buffer', { chunks: this.audioBuffer.length });

    try {
      // Combine all audio chunks
      const combinedAudio = Buffer.concat(this.audioBuffer);
      this.audioBuffer = [];

      // Convert PCM16 to WAV for transcription API
      const wavBuffer = this.pcm16ToWav(combinedAudio, 24000);

      // Step 1: Speech-to-Text
      const sttStartTime = Date.now();
      const transcript = await this.transcribeAudio(wavBuffer);
      logger.info('OPENAI_STT', `STT completed in ${Date.now() - sttStartTime}ms`);
      
      if (!transcript || transcript.trim().length === 0) {
        logger.info('OPENAI_STT', 'No speech detected');
        this.isProcessing = false;
        return;
      }

      logger.info('OPENAI_STT', 'Transcription complete', { text: transcript });
      this.events.onTranscript('user', transcript, true);

      // Step 2 & 3: Stream LLM response and synthesize speech sentence-by-sentence
      const llmStartTime = Date.now();
      await this.generateAndSpeakResponse(transcript);
      
      logger.info('OPENAI_STT', `Total pipeline completed in ${Date.now() - startTime}ms`, {
        sttTime: sttStartTime ? Date.now() - sttStartTime : 0,
        llmTtsTime: Date.now() - llmStartTime,
      });

    } catch (error) {
      logger.error('OPENAI_STT', 'Processing failed', { error: String(error) });
      this.events.onError(`Processing failed: ${error}`);
    } finally {
      this.isProcessing = false;
    }
  }

  private async transcribeAudio(wavBuffer: Buffer): Promise<string> {
    const formData = new FormData();
    formData.append('file', new Blob([wavBuffer], { type: 'audio/wav' }), 'audio.wav');
    formData.append('model', this.sttConfig.sttModel || 'gpt-4o-transcribe');
    formData.append('language', 'en');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Transcription API error: ${error}`);
    }

    const data = await response.json() as { text: string };
    return data.text;
  }

  /**
   * Stream LLM response and synthesize speech sentence-by-sentence
   * This is the key optimization: we don't wait for the full LLM response
   */
  private async generateAndSpeakResponse(userMessage: string): Promise<void> {
    // Add user message to conversation history
    this.conversationHistory.push({ role: 'user', content: userMessage });

    // Keep only last 10 messages for context
    if (this.conversationHistory.length > 10) {
      this.conversationHistory = this.conversationHistory.slice(-10);
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.sttConfig.model,
        messages: [
          { role: 'system', content: this.sttConfig.instructions },
          ...this.conversationHistory,
        ],
        max_tokens: 150,
        temperature: 0.7,
        stream: true,  // Enable streaming!
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Chat API error: ${error}`);
    }

    if (!response.body) {
      throw new Error('No response body for streaming');
    }

    // Process the SSE stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    let sentenceBuffer = '';
    let fullResponse = '';
    let firstAudioSent = false;
    const firstTokenTime = Date.now();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data) as {
              choices: Array<{ delta: { content?: string } }>;
            };
            const token = parsed.choices[0]?.delta?.content || '';
            
            if (token) {
              sentenceBuffer += token;
              fullResponse += token;

              // Check for sentence boundary
              if (SENTENCE_ENDINGS.test(sentenceBuffer)) {
                const sentence = sentenceBuffer.trim();
                sentenceBuffer = '';
                
                if (sentence) {
                  if (!firstAudioSent) {
                    logger.info('OPENAI_STT', `Time to first sentence: ${Date.now() - firstTokenTime}ms`);
                    firstAudioSent = true;
                  }
                  
                  // Synthesize this sentence immediately (streaming)
                  await this.synthesizeSpeechStreaming(sentence);
                }
              }
            }
          } catch {
            // Skip malformed JSON chunks
          }
        }
      }

      // Handle any remaining text that didn't end with punctuation
      if (sentenceBuffer.trim()) {
        await this.synthesizeSpeechStreaming(sentenceBuffer.trim());
      }

      // Update conversation history and emit transcript
      if (fullResponse) {
        this.conversationHistory.push({ role: 'assistant', content: fullResponse });
        this.events.onTranscript('assistant', fullResponse, true);
      }

    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Synthesize speech with streaming audio output
   * Buffers incoming data and sends sample-aligned chunks to avoid garbled audio
   */
  private async synthesizeSpeechStreaming(text: string): Promise<void> {
    logger.info('OPENAI_STT', 'Synthesizing sentence', { text: text.substring(0, 50) });
    
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.sttConfig.ttsModel || 'gpt-4o-mini-tts',
        voice: this.sttConfig.voice,
        input: text,
        response_format: 'pcm',  // Raw PCM for lowest latency
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`TTS API error: ${error}`);
    }

    if (!response.body) {
      throw new Error('No response body for TTS streaming');
    }

    // Buffer for accumulating streamed data
    const chunks: Uint8Array[] = [];
    let totalLength = 0;
    let bytesSent = 0;
    
    // Target chunk size: 4800 bytes = 100ms at 24kHz, 16-bit mono
    // Must be even number for PCM16 sample alignment
    const targetChunkSize = 4800;

    const reader = response.body.getReader();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (value && value.length > 0) {
          chunks.push(value);
          totalLength += value.length;
          
          // When we have enough data, send a sample-aligned chunk
          while (totalLength - bytesSent >= targetChunkSize) {
            const chunk = this.extractChunk(chunks, bytesSent, targetChunkSize);
            bytesSent += targetChunkSize;
            
            this.events.onAudioResponse(chunk.buffer.slice(
              chunk.byteOffset,
              chunk.byteOffset + chunk.byteLength
            ));
          }
        }
        
        if (done) break;
      }

      // Send any remaining data (ensure it's sample-aligned - even number of bytes)
      const remaining = totalLength - bytesSent;
      if (remaining > 0) {
        // Make sure we send an even number of bytes for PCM16 alignment
        const alignedRemaining = remaining - (remaining % 2);
        if (alignedRemaining > 0) {
          const chunk = this.extractChunk(chunks, bytesSent, alignedRemaining);
          this.events.onAudioResponse(chunk.buffer.slice(
            chunk.byteOffset,
            chunk.byteOffset + chunk.byteLength
          ));
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Extract a chunk of data from accumulated buffers
   */
  private extractChunk(chunks: Uint8Array[], offset: number, length: number): Uint8Array {
    const result = new Uint8Array(length);
    let resultOffset = 0;
    let currentOffset = 0;
    
    for (const chunk of chunks) {
      const chunkEnd = currentOffset + chunk.length;
      
      if (chunkEnd <= offset) {
        // This chunk is entirely before our target range
        currentOffset = chunkEnd;
        continue;
      }
      
      if (currentOffset >= offset + length) {
        // We've collected all the data we need
        break;
      }
      
      // Calculate the portion of this chunk we need
      const startInChunk = Math.max(0, offset - currentOffset);
      const endInChunk = Math.min(chunk.length, offset + length - currentOffset);
      const copyLength = endInChunk - startInChunk;
      
      if (copyLength > 0) {
        result.set(chunk.subarray(startInChunk, endInChunk), resultOffset);
        resultOffset += copyLength;
      }
      
      currentOffset = chunkEnd;
    }
    
    return result;
  }

  /**
   * Convert PCM16 raw audio to WAV format for Whisper API
   */
  private pcm16ToWav(pcmData: Buffer, sampleRate: number): Buffer {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = pcmData.length;
    const headerSize = 44;

    const buffer = Buffer.alloc(headerSize + dataSize);

    // RIFF header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);

    // fmt chunk
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // chunk size
    buffer.writeUInt16LE(1, 20); // audio format (PCM)
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(bitsPerSample, 34);

    // data chunk
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);
    pcmData.copy(buffer, 44);

    return buffer;
  }
}


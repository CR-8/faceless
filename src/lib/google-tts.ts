/**
 * Free Google TTS via translate.google.com.
 * Uses google-tts-api which wraps the unofficial translate API.
 * Note: lang must be a 2-letter code ('en', 'en-gb', 'en-au') — NOT 'en-US'.
 */

import fs from 'fs/promises';
import { consola } from 'consola';

export interface TTSOptions {
    text: string;
    voiceName: string;     // e.g. 'en-US-Wavenet-D' (used to pick region)
    languageCode?: string;
    speakingRate?: number;
    pitch?: number;
    rate?: string; // Optional speed override, e.g., '+15%'
}

/**
 * Synthesize speech using the local edge-tts FastAPI server.
 * The server returns an MP3 audio stream which we save to outputPath.
 */
export async function synthesizeSpeech(options: TTSOptions, outputPath: string): Promise<void> {
    try {
        const params = new URLSearchParams({
            text: options.text,
            voice: options.voiceName || 'en-US-GuyNeural',
        });
        if (options.rate) {
            params.append('rate', options.rate);
        }
        const url = `http://localhost:8000/tts?${params.toString()}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            let errorDetail = `HTTP ${response.status}`;
            try {
                const errorData = await response.json();
                errorDetail = errorData.detail || errorDetail;
            } catch {
                // Response wasn't JSON, use status
            }
            throw new Error(`TTS API Error: ${errorDetail}`);
        }
        
        // Response is an MP3 audio stream
        const arrayBuffer = await response.arrayBuffer();
        
        if (arrayBuffer.byteLength === 0) {
            throw new Error('TTS API returned empty audio');
        }
        
        // Write the audio buffer to the output path
        await fs.writeFile(outputPath, Buffer.from(arrayBuffer));
        
        consola.success(`Generated TTS for text: "${options.text.substring(0, 30)}..." -> ${outputPath}`);
    } catch (err: unknown) {
        consola.error(`TTS failed: ${err instanceof Error ? err.message : String(err)}`);
        throw new Error(`TTS failed: ${err instanceof Error ? err.message : String(err)}`);
    }
}


export const VOICE_OPTIONS = [
    { id: 'en-US-Wavenet-D', name: 'David (US ♂)' },
    { id: 'en-US-Wavenet-F', name: 'Fiona (US ♀)' },
    { id: 'en-US-Wavenet-A', name: 'Alex (US ♂)' },
    { id: 'en-US-Wavenet-C', name: 'Clara (US ♀)' },
    { id: 'en-GB-Wavenet-B', name: 'Ben (UK ♂)' },
    { id: 'en-GB-Wavenet-C', name: 'Charlotte (UK ♀)' },
    { id: 'en-AU-Wavenet-B', name: 'Bryson (AU ♂)' },
    { id: 'en-AU-Wavenet-A', name: 'Amelia (AU ♀)' },
] as const;

export type VoiceId = typeof VOICE_OPTIONS[number]['id'];

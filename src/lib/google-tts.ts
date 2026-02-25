/**
 * Free Google TTS via translate.google.com.
 * Uses google-tts-api which wraps the unofficial translate API.
 * Note: lang must be a 2-letter code ('en', 'en-gb', 'en-au') — NOT 'en-US'.
 */

import fs from 'fs/promises';
import * as googleTTS from 'google-tts-api';

export interface TTSOptions {
    text: string;
    voiceName: string;     // e.g. 'en-US-Wavenet-D' (used to pick region)
    languageCode?: string;
    speakingRate?: number;
    pitch?: number;
}

/**
 * Synthesize speech and write MP3 to the given output path.
 * google-tts-api only accepts short locale codes accepted by Google Translate.
 */
export async function synthesizeSpeech(options: TTSOptions, outputPath: string): Promise<void> {
    // google-tts-api uses Google Translate lang codes: 'en', 'en-gb', 'en-au'
    // 'en-US' causes "lang might not exist" — use 'en' as the safe default
    let lang = 'en';
    if (options.voiceName.includes('GB')) lang = 'en-gb';
    else if (options.voiceName.includes('AU')) lang = 'en-au';

    try {
        const results = await googleTTS.getAllAudioBase64(options.text, {
            lang,
            slow: false,
            host: 'https://translate.google.com',
            splitPunct: ',.?!',
        });

        const buffers = results.map(r => Buffer.from(r.base64, 'base64'));
        const finalBuffer = Buffer.concat(buffers);
        await fs.writeFile(outputPath, finalBuffer);
    } catch (err: unknown) {
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

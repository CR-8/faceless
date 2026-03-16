/**
 * Centralized API client using Axios for calling TTS and render services.
 * Handles error handling, retries, and request/response formatting.
 */

import axios, { AxiosError, AxiosInstance } from 'axios';
import { consola } from 'consola';

// Default config - can be overridden by env vars
const TTS_BASE_URL = process.env.NEXT_PUBLIC_TTS_URL || 'http://localhost:8000';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const REQUEST_TIMEOUT = 120000; // 2 minutes for long operations

/* ─── TTS Client ─────────────────────────────────────────────────────────── */
export const ttsClient: AxiosInstance = axios.create({
    baseURL: TTS_BASE_URL,
    timeout: REQUEST_TIMEOUT,
    headers: {
        'Content-Type': 'application/json',
    },
});

/* ─── API Client ─────────────────────────────────────────────────────────── */
export const apiClient: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: REQUEST_TIMEOUT,
    headers: {
        'Content-Type': 'application/json',
    },
});

/* ─── Error handling middleware ──────────────────────────────────────────── */
function getErrorMessage(error: AxiosError): string {
    if (error.response?.data) {
        const data = error.response.data as any;
        return data.detail || data.error || data.message || error.message;
    }
    return error.message || 'An unknown error occurred';
}

ttsClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const message = getErrorMessage(error);
        consola.error(`[TTS API] ${message}`);
        return Promise.reject(new Error(`TTS API Error: ${message}`));
    }
);

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const message = getErrorMessage(error);
        consola.error(`[API Client] ${message}`);
        return Promise.reject(new Error(`API Error: ${message}`));
    }
);

/* ─── TTS Service Methods ────────────────────────────────────────────────── */
export interface TTSRequest {
    text: string;
    voiceName?: string; // Not yet used by Piper, but for future compatibility
    languageCode?: string;
}

/**
 * Generate speech audio from text using the Piper TTS service.
 * Returns the audio as a Blob (WAV format).
 */
export async function generateSpeech(request: TTSRequest): Promise<Blob> {
    try {
        consola.start(`[TTS] Generating speech: "${request.text.substring(0, 40)}..."`);
        
        const response = await ttsClient.get('/tts', {
            params: {
                text: request.text,
            },
            responseType: 'blob', // Important: get binary data
        });

        if (!response.data || response.data.size === 0) {
            throw new Error('TTS returned empty audio');
        }

        consola.success(`[TTS] Generated ${(response.data.size / 1024).toFixed(2)}KB audio`);
        return response.data;
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to generate speech: ${message}`);
    }
}

/**
 * Generate speech and save to local file (Node.js only, not browser).
 */
export async function generateSpeechToFile(request: TTSRequest, outputPath: string): Promise<void> {
    const fs = await import('fs/promises');
    try {
        const blob = await generateSpeech(request);
        const arrayBuffer = await blob.arrayBuffer();
        await fs.writeFile(outputPath, Buffer.from(arrayBuffer));
        consola.success(`[TTS] Saved to ${outputPath}`);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to save speech to file: ${message}`);
    }
}

/* ─── Render Job API Methods ─────────────────────────────────────────────── */
export interface ScriptLine {
    speaker: 'left' | 'right';
    text: string;
}

export interface RenderJobRequest {
    script: ScriptLine[];
    bgId: string;
    leftCharId?: string;
    rightCharId?: string;
    format: '9:16' | '16:9' | '1:1';
    duration: number;
    voiceLeft?: string;
    voiceRight?: string;
    subAlign?: 'left' | 'center' | 'right';
    subSize?: number;
    subPos?: number;
    subColor?: string;
    subFont?: string;
    charSize?: number;
    charPosV?: number;
    topic?: string;
}

export interface Job {
    id: string;
    status: 'pending' | 'queued' | 'processing' | 'completed' | 'error';
    phase: string;
    progress: number;
    script: ScriptLine[];
    bgId: string;
    leftCharId: string;
    rightCharId: string;
    format: string;
    duration: number;
    voiceLeft: string;
    voiceRight: string;
    outputUrl?: string;
    error?: string;
    createdAt: string;
    completedAt?: string;
}

/**
 * Create a new render job.
 */
export async function createRenderJob(request: RenderJobRequest): Promise<{ jobId: string; status: string }> {
    try {
        consola.start(`[API] Creating render job with ${request.script.length} script lines`);
        
        const response = await apiClient.post('/jobs', request);
        
        consola.success(`[API] Job created: ${response.data.jobId}`);
        return response.data;
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to create render job: ${message}`);
    }
}

/**
 * Get a render job by ID.
 */
export async function getRenderJob(jobId: string): Promise<Job> {
    try {
        const response = await apiClient.get(`/jobs/${jobId}`);
        return response.data.job;
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to get render job: ${message}`);
    }
}

/**
 * List all render jobs.
 */
export async function listRenderJobs(): Promise<Job[]> {
    try {
        const response = await apiClient.get('/jobs');
        return response.data.jobs || [];
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to list render jobs: ${message}`);
    }
}

/* ─── Script Generation API Methods ──────────────────────────────────────── */
export interface GenerateScriptRequest {
    topic: string;
    numLines?: number;
    language?: string;
}

/**
 * Generate a script using AI.
 */
export async function generateScript(request: GenerateScriptRequest): Promise<ScriptLine[]> {
    try {
        consola.start(`[API] Generating script for topic: "${request.topic}"`);
        
        const response = await apiClient.post('/generate-script', request);
        
        consola.success(`[API] Generated ${response.data.script?.length || 0} script lines`);
        return response.data.script || [];
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to generate script: ${message}`);
    }
}

/* ─── Polling Utilities ──────────────────────────────────────────────────── */
/**
 * Poll a render job until it's completed or errors out.
 * Returns when status is 'completed', 'error', or timeout is reached.
 */
export async function pollRenderJob(
    jobId: string,
    options?: { pollInterval?: number; maxDuration?: number; onProgress?: (job: Job) => void }
): Promise<Job> {
    const pollInterval = options?.pollInterval || 1000; // Poll every 1s
    const maxDuration = options?.maxDuration || 600000; // Max 10 minutes
    const startTime = Date.now();

    while (Date.now() - startTime < maxDuration) {
        try {
            const job = await getRenderJob(jobId);
            
            if (options?.onProgress) {
                options.onProgress(job);
            }

            if (job.status === 'completed' || job.status === 'error') {
                return job;
            }

            await new Promise((resolve) => setTimeout(resolve, pollInterval));
        } catch (error) {
            consola.error(`[Polling] Error fetching job status: ${error}`);
            await new Promise((resolve) => setTimeout(resolve, pollInterval));
        }
    }

    throw new Error(`Job polling timed out after ${(maxDuration / 1000).toFixed(0)}s`);
}

export default {
    ttsClient,
    apiClient,
    generateSpeech,
    generateSpeechToFile,
    createRenderJob,
    getRenderJob,
    listRenderJobs,
    generateScript,
    pollRenderJob,
};

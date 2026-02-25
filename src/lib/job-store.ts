/**
 * In-memory job store — singleton that survives across API route invocations
 * in development (single Node process). For production replace with MongoDB.
 */

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';
export type Format = '9:16' | '16:9' | '1:1';
export type Speaker = 'left' | 'right';

export interface ScriptLine {
    speaker: Speaker;
    text: string;
}

export interface RenderJob {
    id: string;
    status: JobStatus;
    progress: number;      // 0-100
    phase: string;         // human-readable current phase
    outputUrl: string | null;  // e.g. /outputs/job_123.mp4
    error: string | null;
    createdAt: string;
    updatedAt: string;

    // Job params stored for metadata generation later
    script: ScriptLine[];
    bgId: string;
    leftCharId: string;
    rightCharId: string;
    format: Format;
    duration: number;      // seconds
    voiceLeft: string;
    voiceRight: string;
    subAlign: string;
    topic: string;
    subSize: number;
    subPos: number;
    subColor: string;
    subFont: string;
    charSize: number;
    charPosV: number;
}

// Global store — survives Next.js hot reloads in dev through global
declare global {
    // eslint-disable-next-line no-var
    var __jobStore: Map<string, RenderJob> | undefined;
    // eslint-disable-next-line no-var
    var __activeRenders: number | undefined;
}

export const jobStore: Map<string, RenderJob> =
    global.__jobStore ?? (global.__jobStore = new Map());

export const MAX_CONCURRENT = 2;

export function getActiveCount(): number {
    return global.__activeRenders ?? 0;
}

export function incrementActive(): void {
    global.__activeRenders = (global.__activeRenders ?? 0) + 1;
}

export function decrementActive(): void {
    global.__activeRenders = Math.max(0, (global.__activeRenders ?? 1) - 1);
}

export function createJob(params: Omit<RenderJob, 'id' | 'status' | 'progress' | 'phase' | 'outputUrl' | 'error' | 'createdAt' | 'updatedAt'>): RenderJob {
    const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const job: RenderJob = {
        id,
        status: 'queued',
        progress: 0,
        phase: 'Queued',
        outputUrl: null,
        error: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...params,
    };
    jobStore.set(id, job);
    return job;
}

export function updateJob(id: string, patch: Partial<RenderJob>): void {
    const job = jobStore.get(id);
    if (!job) return;
    Object.assign(job, { ...patch, updatedAt: new Date().toISOString() });
}

export function getJob(id: string): RenderJob | undefined {
    return jobStore.get(id);
}

import { NextRequest, NextResponse } from 'next/server';
import {
    createJob,
    getJob,
    updateJob,
    jobStore,
    getActiveCount,
    incrementActive,
    decrementActive,
    MAX_CONCURRENT,
} from '@/lib/job-store';
import { runRenderPipeline } from '@/lib/ffmpeg-pipeline';

/* POST /api/jobs — create a new render job */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            script, bgId, leftCharId, rightCharId,
            format, duration, voiceLeft, voiceRight,
            subAlign, topic,
            subSize, subPos, subColor, subFont, charSize, charPosV,
        } = body;

        // Validate required fields
        if (!script || !Array.isArray(script) || script.length === 0) {
            return NextResponse.json({ error: 'script is required (array of {speaker, text})' }, { status: 400 });
        }
        if (!bgId || !format || !duration) {
            return NextResponse.json({ error: 'bgId, format, and duration are required' }, { status: 400 });
        }
        if (!['9:16', '16:9', '1:1'].includes(format)) {
            return NextResponse.json({ error: 'format must be 9:16, 16:9, or 1:1' }, { status: 400 });
        }

        // Create job in store
        const job = createJob({
            script,
            bgId,
            leftCharId: leftCharId ?? 'char-a',
            rightCharId: rightCharId ?? 'char-b',
            format,
            duration: Number(duration),
            voiceLeft: voiceLeft ?? 'en-US-Wavenet-D',
            voiceRight: voiceRight ?? 'en-US-Wavenet-F',
            subAlign: subAlign ?? 'center',
            topic: topic ?? '',
            subSize: Number(subSize) || 56,
            subPos: Number(subPos) || 50,
            subColor: subColor ?? '#2196f3',
            subFont: subFont ?? 'Arial',
            charSize: charSize !== undefined ? Number(charSize) : 50,
            charPosV: charPosV !== undefined ? Number(charPosV) : 0,
        });

        // Start render asynchronously (don't await)
        startRenderAsync(job.id).catch((err) => {
            console.error(`[${job.id}] Unhandled render error:`, err);
        });

        return NextResponse.json({ jobId: job.id, status: job.status }, { status: 201 });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/* GET /api/jobs — list all jobs (most recent first) */
export async function GET() {
    const jobs = Array.from(jobStore.values())
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 20);
    return NextResponse.json({ jobs });
}

/* ─── Async render runner ────────────────────────────────────────────────── */
async function startRenderAsync(jobId: string): Promise<void> {
    const job = getJob(jobId);
    if (!job) return;

    // Concurrency check
    if (getActiveCount() >= MAX_CONCURRENT) {
        updateJob(jobId, { status: 'queued', phase: `Waiting for slot (${getActiveCount()}/${MAX_CONCURRENT} active)` });
        // Retry after a short delay
        await new Promise((r) => setTimeout(r, 3000));
        return startRenderAsync(jobId);
    }

    incrementActive();
    updateJob(jobId, { status: 'processing', phase: 'Starting', progress: 2 });

    try {
        const outputUrl = await runRenderPipeline({
            jobId,
            script: job.script,
            bgId: job.bgId,
            leftCharId: job.leftCharId,
            rightCharId: job.rightCharId,
            format: job.format,
            duration: job.duration,
            voiceLeft: job.voiceLeft,
            voiceRight: job.voiceRight,
            subAlign: job.subAlign,
            subSize: job.subSize,
            subPos: job.subPos,
            subColor: job.subColor,
            subFont: job.subFont,
            charSize: job.charSize,
            charPosV: job.charPosV,
        });

        updateJob(jobId, { status: 'completed', outputUrl, progress: 100, phase: 'Done' });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[${jobId}] Render failed:`, msg);
        updateJob(jobId, { status: 'failed', error: msg, phase: 'Failed' });
    } finally {
        decrementActive();
    }
}

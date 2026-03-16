import { NextRequest, NextResponse } from 'next/server';
import { getJob, updateJob } from '@/lib/job-store';

/* GET /api/jobs/[id] — poll job status */
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const job = getJob(id);

    if (!job) {
        return NextResponse.json({ error: `Job "${id}" not found` }, { status: 404 });
    }

    return NextResponse.json({
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        phase: job.phase,
        outputUrl: job.outputUrl,
        error: job.error,
        paused: job.paused,
        updatedAt: job.updatedAt,
    });
}

/* DELETE /api/jobs/[id] — cancel a job */
export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const job = getJob(id);
    if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (job.status === 'completed') return NextResponse.json({ error: 'Job already completed' }, { status: 400 });

    updateJob(id, { cancelled: true, status: 'cancelled', phase: 'Cancelled', paused: false });
    return NextResponse.json({ ok: true });
}

/* PATCH /api/jobs/[id] — pause or resume a job */
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const job = getJob(id);
    if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { action } = await req.json() as { action: 'pause' | 'resume' };
    if (action === 'pause') {
        updateJob(id, { paused: true, status: 'paused', phase: 'Paused' });
    } else if (action === 'resume') {
        updateJob(id, { paused: false, status: 'processing' });
    }
    return NextResponse.json({ ok: true });
}

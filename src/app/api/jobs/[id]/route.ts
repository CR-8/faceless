import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/lib/job-store';

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
        updatedAt: job.updatedAt,
    });
}

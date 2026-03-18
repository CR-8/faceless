'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AnalyticsSummary } from '@/types/db';

interface RetentionGraphProps {
  summaries: AnalyticsSummary[];
  durationSeconds: number;
}

export function RetentionGraph({ summaries, durationSeconds }: RetentionGraphProps) {
  if (summaries.length === 0 || durationSeconds === 0) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Retention</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-zinc-500 text-sm text-center py-8">Retention data unavailable for this video.</p>
        </CardContent>
      </Card>
    );
  }

  // Build a simple retention curve: for each summary snapshot, compute retention % = avg_view_duration / duration
  // Sort by snapshot_timestamp to show trend over time
  const sorted = [...summaries].sort((a, b) =>
    new Date(a.snapshot_timestamp).getTime() - new Date(b.snapshot_timestamp).getTime()
  );

  const points = sorted.map((s, i) => ({
    x: (i / Math.max(sorted.length - 1, 1)) * 100,
    y: Math.min(100, Math.round((s.avg_view_duration_secs / durationSeconds) * 100)),
  }));

  // SVG path
  const W = 300;
  const H = 100;
  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${(p.x / 100) * W} ${H - (p.y / 100) * H}`)
    .join(' ');

  const avgRetention = Math.round(points.reduce((s, p) => s + p.y, 0) / points.length);

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Retention</CardTitle>
        <span className="text-xs text-zinc-500">Avg {avgRetention}%</span>
      </CardHeader>
      <CardContent>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-24" preserveAspectRatio="none">
          <defs>
            <linearGradient id="retentionGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={`${pathD} L ${W} ${H} L 0 ${H} Z`}
            fill="url(#retentionGrad)"
          />
          <path d={pathD} stroke="#f59e0b" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="flex justify-between text-xs text-zinc-600 mt-1">
          <span>0%</span>
          <span>100% of video</span>
        </div>
      </CardContent>
    </Card>
  );
}

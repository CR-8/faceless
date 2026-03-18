import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AnalyticsSummary } from '@/types/db';
import { ThumbsUp, MessageCircle, Share2 } from 'lucide-react';

interface EngagementBreakdownProps {
  summaries: AnalyticsSummary[];
}

export function EngagementBreakdown({ summaries }: EngagementBreakdownProps) {
  const latest = summaries.length > 0
    ? summaries.reduce((a, b) =>
        new Date(a.snapshot_timestamp) > new Date(b.snapshot_timestamp) ? a : b
      )
    : null;

  const metrics = [
    { label: 'Likes', value: latest?.like_count ?? 0, icon: ThumbsUp, color: 'text-amber-400' },
    { label: 'Comments', value: latest?.comment_count ?? 0, icon: MessageCircle, color: 'text-blue-400' },
    { label: 'Shares', value: latest?.share_count ?? 0, icon: Share2, color: 'text-emerald-400' },
  ];

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Engagement</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {metrics.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="flex flex-col items-center gap-2 p-3 rounded-lg bg-zinc-800/50">
              <Icon size={18} className={color} />
              <span className="text-xl font-bold text-white">{value.toLocaleString()}</span>
              <span className="text-xs text-zinc-500">{label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

import { RetentionGraph } from './RetentionGraph';
import { EngagementBreakdown } from './EngagementBreakdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAnalyticsSummaries } from '@/lib/get-analytics';
import { createSupabaseServerClient } from '@/lib/supabase';
import { BarChart2 } from 'lucide-react';

interface VideoAnalyticsDetailProps {
  videoId: string;
  averageViewCount: number;
}

export async function VideoAnalyticsDetail({ videoId, averageViewCount }: VideoAnalyticsDetailProps) {
  const supabase = await createSupabaseServerClient();
  const { data: video } = await supabase.from('videos').select('*').eq('id', videoId).single();
  const summaries = await getAnalyticsSummaries(videoId);

  const latestSummary = summaries.length > 0
    ? summaries.reduce((a, b) => new Date(a.snapshot_timestamp) > new Date(b.snapshot_timestamp) ? a : b)
    : null;

  const videoViews = latestSummary?.view_count ?? 0;
  const comparisonRatio = averageViewCount > 0
    ? Math.round((videoViews / averageViewCount) * 100) / 100
    : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Video title */}
      {video && (
        <div>
          <h2 className="text-lg font-bold text-white">{video.title}</h2>
          <p className="text-xs text-zinc-500 mt-1 capitalize">{video.platform}</p>
        </div>
      )}

      {/* Performance comparison */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Performance vs Average</CardTitle>
        </CardHeader>
        <CardContent>
          {comparisonRatio !== null ? (
            <div className="flex items-center gap-3">
              <BarChart2 size={20} className={comparisonRatio >= 1 ? 'text-emerald-400' : 'text-red-400'} />
              <div>
                <p className="text-2xl font-bold text-white">{comparisonRatio}×</p>
                <p className="text-xs text-zinc-500">
                  {comparisonRatio >= 1
                    ? `${Math.round((comparisonRatio - 1) * 100)}% above average`
                    : `${Math.round((1 - comparisonRatio) * 100)}% below average`}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-zinc-500 text-sm">No comparison data available.</p>
          )}
        </CardContent>
      </Card>

      <EngagementBreakdown summaries={summaries} />
      <RetentionGraph summaries={summaries} durationSeconds={video?.duration_seconds ?? 0} />
    </div>
  );
}

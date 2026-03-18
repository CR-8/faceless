import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DemoBadge } from '@/components/analytics/DemoBadge';
import { getVideosForUser, getAnalyticsSummaries } from '@/lib/get-analytics';
import { createSupabaseServerClient } from '@/lib/supabase';
import { Eye, TrendingUp, Star, Calendar } from 'lucide-react';
import type { AnalyticsSummary, Video } from '@/types/db';

async function computeOverview(userId: string) {
  const videos = await getVideosForUser(userId);
  if (videos.length === 0) {
    return { totalViews: 0, growthPct: 0, bestPlatform: '—', postsPerWeek: 0 };
  }

  // Gather all summaries
  const allSummaries: AnalyticsSummary[] = [];
  for (const video of videos) {
    const summaries = await getAnalyticsSummaries(video.id);
    allSummaries.push(...summaries);
  }

  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const sixtyDaysAgo = now - 60 * 24 * 60 * 60 * 1000;

  const current30 = allSummaries.filter(s => new Date(s.snapshot_timestamp).getTime() >= thirtyDaysAgo);
  const prev30 = allSummaries.filter(s => {
    const t = new Date(s.snapshot_timestamp).getTime();
    return t >= sixtyDaysAgo && t < thirtyDaysAgo;
  });

  const totalViews = current30.reduce((sum, s) => sum + s.view_count, 0);
  const prevViews = prev30.reduce((sum, s) => sum + s.view_count, 0);
  const growthPct = prevViews > 0 ? Math.round(((totalViews - prevViews) / prevViews) * 100) : 0;

  // Best platform by total views
  const viewsByPlatform: Record<string, number> = {};
  for (const video of videos) {
    const platform = video.platform;
    const videoSummaries = allSummaries.filter(s => s.video_id === video.id);
    const views = videoSummaries.reduce((sum, s) => sum + s.view_count, 0);
    viewsByPlatform[platform] = (viewsByPlatform[platform] ?? 0) + views;
  }
  const bestPlatform = Object.entries(viewsByPlatform).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

  // Posts per week (last 30 days / 4 weeks)
  const recentVideos = videos.filter(v => v.published_at && new Date(v.published_at).getTime() >= thirtyDaysAgo);
  const postsPerWeek = Math.round((recentVideos.length / 4) * 10) / 10;

  return { totalViews, growthPct, bestPlatform, postsPerWeek };
}

export async function AnalyticsOverview() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { totalViews, growthPct, bestPlatform, postsPerWeek } = await computeOverview(user?.id ?? '');

  const metrics = [
    { label: 'Total Views', value: totalViews.toLocaleString(), icon: Eye },
    { label: 'Growth (30d)', value: `${growthPct > 0 ? '+' : ''}${growthPct}%`, icon: TrendingUp },
    { label: 'Best Platform', value: bestPlatform, icon: Star },
    { label: 'Posts / Week', value: postsPerWeek.toString(), icon: Calendar },
  ];

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Overview</CardTitle>
        <DemoBadge />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {metrics.map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-zinc-500">
                <Icon size={14} />
                <span className="text-xs">{label}</span>
              </div>
              <p className="text-xl font-bold text-white">{value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

import type { AnalyticsSummary, Video, PerformanceSnapshot } from '@/types/db';
import {
  isMockMode,
  MOCK_ANALYTICS_SUMMARY,
  MOCK_VIDEOS,
  MOCK_PERFORMANCE_SNAPSHOT,
} from './mock-analytics';
import { createSupabaseServerClient } from './supabase';

export async function getAnalyticsSummaries(videoId: string): Promise<AnalyticsSummary[]> {
  if (isMockMode || !videoId) {
    return MOCK_ANALYTICS_SUMMARY.filter((s) => s.video_id === videoId);
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('analytics_summary')
    .select('*')
    .eq('video_id', videoId)
    .order('snapshot_timestamp', { ascending: false });
  if (error) return [];
  return data ?? [];
}

export async function getVideosForUser(userId: string): Promise<Video[]> {
  if (isMockMode || !userId) {
    return MOCK_VIDEOS.filter((v) => v.user_id === userId);
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('user_id', userId)
    .order('published_at', { ascending: false });
  // Table may not exist yet — return empty rather than crash
  if (error) return [];
  return data ?? [];
}

export async function getPerformanceSnapshot(userId: string): Promise<PerformanceSnapshot> {
  if (isMockMode) {
    return MOCK_PERFORMANCE_SNAPSHOT;
  }
  const supabase = await createSupabaseServerClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: videos } = await supabase
    .from('videos')
    .select('id, title')
    .eq('user_id', userId);

  if (!videos || videos.length === 0) {
    return { total_views_7d: 0, engagement_rate: 0, top_video_title: '' };
  }

  const videoIds = videos.map((v: { id: string }) => v.id);
  const { data: summaries } = await supabase
    .from('analytics_summary')
    .select('*')
    .in('video_id', videoIds)
    .gte('snapshot_timestamp', sevenDaysAgo);

  const rows = summaries ?? [];
  const total_views_7d = rows.reduce((sum: number, r: AnalyticsSummary) => sum + r.view_count, 0);
  const totalEngagement = rows.reduce(
    (sum: number, r: AnalyticsSummary) => sum + r.like_count + r.comment_count + r.share_count,
    0
  );
  const engagement_rate =
    total_views_7d > 0 ? Math.round((totalEngagement / total_views_7d) * 1000) / 10 : 0;

  const viewsByVideo: Record<string, number> = {};
  for (const r of rows as AnalyticsSummary[]) {
    viewsByVideo[r.video_id] = (viewsByVideo[r.video_id] ?? 0) + r.view_count;
  }
  const topVideoId =
    Object.entries(viewsByVideo).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
  const topVideo = videos.find((v: { id: string; title: string }) => v.id === topVideoId);

  return {
    total_views_7d,
    engagement_rate,
    top_video_title: topVideo?.title ?? '',
  };
}

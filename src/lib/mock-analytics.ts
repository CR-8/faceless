import type { Video, AnalyticsSummary, PerformanceSnapshot } from '@/types/db';

export const isMockMode = process.env.NEXT_PUBLIC_MOCK_ANALYTICS === 'true';

export const MOCK_VIDEOS: Video[] = [
  {
    id: 'mock-video-1',
    user_id: 'mock-user-1',
    project_id: 'mock-project-1',
    platform: 'youtube',
    platform_video_id: 'yt-abc123',
    title: 'Why AI Will Change Everything',
    published_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    duration_seconds: 480,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-video-2',
    user_id: 'mock-user-1',
    project_id: 'mock-project-2',
    platform: 'youtube',
    platform_video_id: 'yt-def456',
    title: 'Top 10 Productivity Hacks',
    published_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    duration_seconds: 360,
    created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-video-3',
    user_id: 'mock-user-1',
    project_id: 'mock-project-3',
    platform: 'instagram',
    platform_video_id: 'ig-ghi789',
    title: 'Morning Routine That Changed My Life',
    published_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    duration_seconds: 60,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const MOCK_ANALYTICS_SUMMARY: AnalyticsSummary[] = [
  {
    id: 'mock-summary-1',
    video_id: 'mock-video-1',
    snapshot_timestamp: new Date().toISOString(),
    view_count: 84200,
    like_count: 3100,
    comment_count: 420,
    share_count: 890,
    avg_view_duration_secs: 210,
  },
  {
    id: 'mock-summary-2',
    video_id: 'mock-video-2',
    snapshot_timestamp: new Date().toISOString(),
    view_count: 41500,
    like_count: 1800,
    comment_count: 230,
    share_count: 410,
    avg_view_duration_secs: 180,
  },
  {
    id: 'mock-summary-3',
    video_id: 'mock-video-3',
    snapshot_timestamp: new Date().toISOString(),
    view_count: 16600,
    like_count: 920,
    comment_count: 115,
    share_count: 340,
    avg_view_duration_secs: 45,
  },
];

export const MOCK_PERFORMANCE_SNAPSHOT: PerformanceSnapshot = {
  total_views_7d: 142300,
  engagement_rate: 4.7,
  top_video_title: 'Why AI Will Change Everything',
};

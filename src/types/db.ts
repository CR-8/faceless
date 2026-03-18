// src/types/db.ts

export interface Project {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: 'draft' | 'scheduled' | 'published';
  studio_state: StudioStatePayload | null;
  thumbnail_url: string | null;
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudioStatePayload {
  bgId: string;
  leftCharId: string;
  rightCharId: string;
  script: string;
  format: '9:16' | '16:9' | '1:1';
  duration: number;
  voiceL: string;
  voiceR: string;
  subAlign: string;
  subSize: number;
  subPos: number;
  subColor: string;
  subFont: string;
  charSize: number;
  charPosV: number;
}

export interface Account {
  id: string;
  user_id: string;
  provider: 'youtube' | 'instagram';
  provider_account_id: string;
  display_name: string | null;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string;
  status: 'connected' | 'disconnected';
  last_synced_at: string | null;
  last_manual_refresh_at: string | null;
  quota_reset_at: string | null;
}

export interface Video {
  id: string;
  user_id: string;
  project_id: string | null;
  platform: 'youtube' | 'instagram';
  platform_video_id: string;
  title: string;
  published_at: string | null;
  duration_seconds: number | null;
  created_at: string;
}

export interface AnalyticsSummary {
  id: string;
  video_id: string;
  snapshot_timestamp: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  avg_view_duration_secs: number;
}

export interface AnalyticsSummaryDaily {
  id: string;
  video_id: string;
  day: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  avg_view_duration_secs: number;
}

export interface PerformanceSnapshot {
  total_views_7d: number;
  engagement_rate: number;
  top_video_title: string;
}

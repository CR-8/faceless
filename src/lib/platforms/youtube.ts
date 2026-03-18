/**
 * YouTube platform adapter (Phase 2)
 */
import type { Account, AnalyticsSummary } from '@/types/db';
import type { PlatformAdapter } from '@/lib/analytics-sync';

const YT_API = 'https://www.googleapis.com/youtube/v3';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const BATCH_SIZE = 50;

async function ytFetch(url: string, accessToken: string) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 429) throw new Error('429 quota exceeded');
  if (!res.ok) throw new Error(`YouTube API error ${res.status}`);
  return res.json();
}

export const youtubeAdapter: PlatformAdapter = {
  async fetchVideoList(account: Account): Promise<string[]> {
    // Get uploads playlist id from channel
    const channelData = await ytFetch(
      `${YT_API}/channels?part=contentDetails&mine=true`,
      account.access_token
    );
    const uploadsId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsId) return [];

    const videoIds: string[] = [];
    let pageToken: string | undefined;

    do {
      const url = `${YT_API}/playlistItems?part=contentDetails&playlistId=${uploadsId}&maxResults=50${pageToken ? `&pageToken=${pageToken}` : ''}`;
      const data = await ytFetch(url, account.access_token);
      for (const item of data.items ?? []) {
        videoIds.push(item.contentDetails.videoId);
      }
      pageToken = data.nextPageToken;
    } while (pageToken);

    return videoIds;
  },

  async fetchMetrics(account: Account, videoIds: string[]): Promise<Array<{
    platform_video_id: string;
    view_count: number;
    like_count: number;
    comment_count: number;
    share_count: number;
    avg_view_duration_secs: number;
  }>> {
    const results = [];

    for (let i = 0; i < videoIds.length; i += BATCH_SIZE) {
      const batch = videoIds.slice(i, i + BATCH_SIZE).join(',');
      const data = await ytFetch(
        `${YT_API}/videos?part=statistics&id=${batch}`,
        account.access_token
      );

      for (const item of data.items ?? []) {
        const s = item.statistics;
        results.push({
          platform_video_id: item.id,
          view_count: parseInt(s.viewCount ?? '0', 10),
          like_count: parseInt(s.likeCount ?? '0', 10),
          comment_count: parseInt(s.commentCount ?? '0', 10),
          share_count: 0, // YouTube API doesn't expose share count
          avg_view_duration_secs: 0, // Requires YouTube Analytics API (separate quota)
        });
      }
    }

    return results;
  },

  async refreshToken(account: Account): Promise<{ access_token: string; expires_at: string }> {
    if (!account.refresh_token) throw new Error('No refresh token available');

    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: account.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
    const data = await res.json();

    const expires_at = new Date(Date.now() + data.expires_in * 1000).toISOString();
    return { access_token: data.access_token, expires_at };
  },
};

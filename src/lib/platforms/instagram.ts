/**
 * Instagram platform adapter (Phase 3)
 */
import type { Account } from '@/types/db';
import type { PlatformAdapter } from '@/lib/analytics-sync';

const GRAPH_API = 'https://graph.instagram.com/v19.0';
const META_TOKEN_URL = 'https://graph.instagram.com/refresh_access_token';

async function igFetch(url: string, accessToken: string) {
  const sep = url.includes('?') ? '&' : '?';
  const res = await fetch(`${url}${sep}access_token=${accessToken}`);
  if (res.status === 429) throw new Error('429 quota exceeded');
  if (!res.ok) throw new Error(`Instagram API error ${res.status}`);
  return res.json();
}

export const instagramAdapter: PlatformAdapter = {
  async fetchVideoList(account: Account): Promise<string[]> {
    const mediaIds: string[] = [];
    let url = `${GRAPH_API}/me/media?fields=id&limit=100`;

    while (url) {
      const data = await igFetch(url, account.access_token);
      for (const item of data.data ?? []) mediaIds.push(item.id);
      url = data.paging?.next ?? '';
    }

    return mediaIds;
  },

  async fetchMetrics(account: Account, mediaIds: string[]): Promise<Array<{
    platform_video_id: string;
    view_count: number;
    like_count: number;
    comment_count: number;
    share_count: number;
    avg_view_duration_secs: number;
  }>> {
    const results = [];

    for (const mediaId of mediaIds) {
      try {
        const data = await igFetch(
          `${GRAPH_API}/${mediaId}/insights?metric=impressions,reach,likes,comments,shares`,
          account.access_token
        );

        const metric = (name: string) =>
          (data.data ?? []).find((m: { name: string; values: Array<{ value: number }> }) => m.name === name)?.values?.[0]?.value ?? 0;

        results.push({
          platform_video_id: mediaId,
          view_count: metric('impressions'),
          like_count: metric('likes'),
          comment_count: metric('comments'),
          share_count: metric('shares'),
          avg_view_duration_secs: 0, // Not available via basic insights
        });
      } catch {
        // Skip individual media errors
      }
    }

    return results;
  },

  async refreshToken(account: Account): Promise<{ access_token: string; expires_at: string }> {
    const res = await fetch(
      `${META_TOKEN_URL}?grant_type=ig_refresh_token&access_token=${account.access_token}`
    );
    if (!res.ok) throw new Error(`Instagram token refresh failed: ${res.status}`);
    const data = await res.json();
    const expires_at = new Date(Date.now() + data.expires_in * 1000).toISOString();
    return { access_token: data.access_token, expires_at };
  },
};

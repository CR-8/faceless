/**
 * analytics-sync.ts — server-side only, no "use client"
 * Orchestrates per-account metric fetching, token refresh, and data retention.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Account } from '@/types/db';

const TOKEN_REFRESH_WINDOW_MS = 5 * 60 * 1000; // 5 minutes before expiry
const RETENTION_DAYS = 30;

export interface SyncResult {
  synced: number;
  errors: Array<{ accountId: string; error: string }>;
}

// Platform adapter interface — implemented by youtube.ts / instagram.ts
export interface PlatformAdapter {
  fetchVideoList(account: Account): Promise<string[]>;
  fetchMetrics(account: Account, videoIds: string[]): Promise<Array<{
    platform_video_id: string;
    view_count: number;
    like_count: number;
    comment_count: number;
    share_count: number;
    avg_view_duration_secs: number;
  }>>;
  refreshToken(account: Account): Promise<{ access_token: string; expires_at: string }>;
}

// Registry — populated by platform modules
const adapters: Partial<Record<string, PlatformAdapter>> = {};

export function registerAdapter(provider: string, adapter: PlatformAdapter) {
  adapters[provider] = adapter;
}

export async function runSync(
  userId?: string,
  supabaseClient?: SupabaseClient
): Promise<SyncResult> {
  // Import service client lazily to avoid browser bundle inclusion
  const supabase: SupabaseClient = supabaseClient
    ?? await import('./supabase').then(m => m.createSupabaseServiceClient());

  let query = supabase
    .from('accounts')
    .select('*')
    .eq('status', 'connected');

  if (userId) query = query.eq('user_id', userId);

  const { data: accounts, error } = await query;
  if (error) return { synced: 0, errors: [{ accountId: 'query', error: error.message }] };

  const result: SyncResult = { synced: 0, errors: [] };
  const quotaExhaustedPlatforms = new Set<string>();

  for (const account of (accounts ?? []) as Account[]) {
    if (quotaExhaustedPlatforms.has(account.provider)) continue;

    try {
      // Token refresh if expiring soon
      const expiresAt = new Date(account.token_expires_at).getTime();
      if (expiresAt - Date.now() < TOKEN_REFRESH_WINDOW_MS) {
        const adapter = adapters[account.provider];
        if (adapter) {
          try {
            const refreshed = await adapter.refreshToken(account);
            await supabase
              .from('accounts')
              .update({ access_token: refreshed.access_token, token_expires_at: refreshed.expires_at })
              .eq('id', account.id);
            account.access_token = refreshed.access_token;
            account.token_expires_at = refreshed.expires_at;
          } catch {
            await supabase
              .from('accounts')
              .update({ status: 'disconnected' })
              .eq('id', account.id);
            result.errors.push({ accountId: account.id, error: 'Token refresh failed — account disconnected' });
            continue;
          }
        }
      }

      // Fetch metrics via adapter
      const adapter = adapters[account.provider];
      if (!adapter) {
        // No adapter registered yet (Phase 2/3) — skip silently
        continue;
      }

      let videoIds: string[];
      try {
        videoIds = await adapter.fetchVideoList(account);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('429') || msg.toLowerCase().includes('quota')) {
          quotaExhaustedPlatforms.add(account.provider);
          const quotaResetAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          await supabase.from('accounts').update({ quota_reset_at: quotaResetAt }).eq('id', account.id);
          result.errors.push({ accountId: account.id, error: 'Quota exceeded' });
          continue;
        }
        throw e;
      }

      const metrics = await adapter.fetchMetrics(account, videoIds);
      const now = new Date().toISOString();

      // Insert analytics_summary rows
      if (metrics.length > 0) {
        const rows = metrics.map(m => ({
          video_id: m.platform_video_id, // resolved to internal id by adapter
          snapshot_timestamp: now,
          view_count: m.view_count,
          like_count: m.like_count,
          comment_count: m.comment_count,
          share_count: m.share_count,
          avg_view_duration_secs: m.avg_view_duration_secs,
        }));
        await supabase.from('analytics_summary').insert(rows);
      }

      // Update last_synced_at
      await supabase.from('accounts').update({ last_synced_at: now }).eq('id', account.id);
      result.synced++;

      // Data retention: aggregate rows older than 30 days into daily table, then prune
      await runRetention(supabase as SupabaseClient);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      result.errors.push({ accountId: account.id, error: msg });
    }
  }

  return result;
}

async function runRetention(supabase: SupabaseClient) {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // Aggregate old rows into analytics_summary_daily
  await supabase.rpc('aggregate_analytics_daily', { cutoff_date: cutoff }).maybeSingle();

  // Delete raw rows older than cutoff
  await supabase
    .from('analytics_summary')
    .delete()
    .lt('snapshot_timestamp', cutoff);
}

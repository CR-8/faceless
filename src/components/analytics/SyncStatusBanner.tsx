import { createSupabaseServerClient } from '@/lib/supabase';
import { isMockMode } from '@/lib/mock-analytics';
import { AlertTriangle, XCircle } from 'lucide-react';

export async function SyncStatusBanner() {
  if (isMockMode) return null;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: accounts } = await supabase
    .from('accounts')
    .select('last_synced_at, status')
    .eq('user_id', user.id);

  if (!accounts || accounts.length === 0) return null;

  const hasConnected = accounts.some(a => a.status === 'connected');
  const lastSynced = accounts
    .map(a => a.last_synced_at ? new Date(a.last_synced_at).getTime() : 0)
    .reduce((max, t) => Math.max(max, t), 0);

  // No snapshot at all
  if (hasConnected && lastSynced === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-700 bg-red-950/40 px-4 py-3 text-sm text-red-400">
        <XCircle size={16} className="shrink-0" />
        Analytics data unavailable. Sync has not run yet.
      </div>
    );
  }

  // Stale data — last sync was more than 12 hours ago
  const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;
  if (lastSynced > 0 && lastSynced < twelveHoursAgo) {
    const lastSyncedStr = new Date(lastSynced).toLocaleString();
    return (
      <div className="flex items-center gap-2 rounded-lg border border-amber-700 bg-amber-950/40 px-4 py-3 text-sm text-amber-400">
        <AlertTriangle size={16} className="shrink-0" />
        Showing data from {lastSyncedStr}. Sync may have failed.
      </div>
    );
  }

  return null;
}

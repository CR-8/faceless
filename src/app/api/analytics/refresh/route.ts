import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';
import { runSync } from '@/lib/analytics-sync';

const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check last_manual_refresh_at across all accounts for this user
  const { data: accounts, error: accountsError } = await supabase
    .from('accounts')
    .select('id, last_manual_refresh_at')
    .eq('user_id', user.id);

  if (accountsError) {
    return NextResponse.json({ error: accountsError.message }, { status: 500 });
  }

  const now = Date.now();
  const mostRecentRefresh = (accounts ?? [])
    .map(a => a.last_manual_refresh_at ? new Date(a.last_manual_refresh_at).getTime() : 0)
    .reduce((max, t) => Math.max(max, t), 0);

  if (mostRecentRefresh > 0 && now - mostRecentRefresh < COOLDOWN_MS) {
    const nextRefreshAt = new Date(mostRecentRefresh + COOLDOWN_MS).toISOString();
    return NextResponse.json({ error: 'Rate limited', nextRefreshAt }, { status: 429 });
  }

  // Update last_manual_refresh_at for all connected accounts
  if ((accounts ?? []).length > 0) {
    await supabase
      .from('accounts')
      .update({ last_manual_refresh_at: new Date().toISOString() })
      .eq('user_id', user.id);
  }

  // Run sync for this user
  await runSync(user.id);
  const last_synced_at = new Date().toISOString();

  return NextResponse.json({ success: true, last_synced_at });
}

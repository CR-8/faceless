import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { runSync } from '@/lib/analytics-sync';

const CRON_SECRET = process.env.CRON_SECRET;
const MIN_INTERVAL_MS = 60 * 1000; // 1 minute

// Vercel cron IP allowlist (comma-separated in env)
const CRON_IP_ALLOWLIST = (process.env.VERCEL_CRON_IP_ALLOWLIST ?? '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

export async function POST(req: NextRequest) {
  // Layer 1: CRON_SECRET header check
  const authHeader = req.headers.get('authorization');
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Layer 2: IP allowlist check (only enforced when allowlist is configured)
  if (CRON_IP_ALLOWLIST.length > 0) {
    const clientIp =
      req.headers.get('x-vercel-forwarded-for') ??
      req.headers.get('x-forwarded-for') ??
      '';
    const requestIp = clientIp.split(',')[0].trim();
    if (!CRON_IP_ALLOWLIST.includes(requestIp)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // Layer 3: Idempotency — check last_triggered_at in sync_state table
  const supabase = await createSupabaseServiceClient();
  const { data: syncState } = await supabase
    .from('sync_state')
    .select('last_triggered_at')
    .eq('id', 'global')
    .maybeSingle();

  const lastTriggered = syncState?.last_triggered_at
    ? new Date(syncState.last_triggered_at).getTime()
    : 0;

  if (Date.now() - lastTriggered < MIN_INTERVAL_MS) {
    return NextResponse.json({ error: 'Too soon' }, { status: 403 });
  }

  // Update last_triggered_at before running sync
  await supabase
    .from('sync_state')
    .upsert({ id: 'global', last_triggered_at: new Date().toISOString() });

  const result = await runSync(undefined, supabase);
  return NextResponse.json(result);
}

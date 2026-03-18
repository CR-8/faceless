import { createSupabaseServerClient } from '@/lib/supabase';
import { isMockMode } from '@/lib/mock-analytics';
import { Clock } from 'lucide-react';

export async function QuotaWarning() {
  if (isMockMode) return null;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: accounts } = await supabase
    .from('accounts')
    .select('provider, quota_reset_at')
    .eq('user_id', user.id)
    .not('quota_reset_at', 'is', null);

  if (!accounts || accounts.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {accounts.map(a => (
        <div
          key={a.provider}
          className="flex items-center gap-2 rounded-lg border border-amber-700 bg-amber-950/40 px-4 py-3 text-sm text-amber-400"
        >
          <Clock size={16} className="shrink-0" />
          {a.provider} quota exceeded. Resets at{' '}
          {a.quota_reset_at ? new Date(a.quota_reset_at).toLocaleString() : 'unknown'}.
        </div>
      ))}
    </div>
  );
}

import { Suspense } from 'react';
import { AccountInfo } from '@/components/settings/AccountInfo';
import { OAuthSection } from '@/components/settings/OAuthSection';
import { Skeleton } from '@/components/ui/skeleton';
import { createSupabaseServerClient } from '@/lib/supabase';

interface SearchParams {
  connected?: string;
  error?: string;
}

interface Props {
  searchParams: Promise<SearchParams>;
}

async function ConnectedAccounts() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <OAuthSection accounts={[]} />;

  const { data } = await supabase
    .from('accounts')
    .select('provider, display_name')
    .eq('user_id', user.id)
    .eq('status', 'connected');

  return <OAuthSection accounts={data ?? []} />;
}

export default async function SettingsPage({ searchParams }: Props) {
  const params = await searchParams;
  const successProvider = params.connected;
  const errorCode = params.error;

  return (
    <div className="p-6 md:p-8 flex flex-col gap-6 max-w-2xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
        <p className="text-zinc-500 text-sm mt-1">Manage your account and connected platforms.</p>
      </div>

      {successProvider && (
        <div className="rounded-lg border border-emerald-700 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-400">
          Successfully connected {successProvider}.
        </div>
      )}
      {errorCode === 'oauth_failed' && (
        <div className="rounded-lg border border-red-700 bg-red-950/40 px-4 py-3 text-sm text-red-400">
          OAuth connection failed. Please try again.
        </div>
      )}

      <Suspense fallback={<Skeleton className="h-24 w-full rounded-lg" />}>
        <AccountInfo />
      </Suspense>

      <div>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Connected Platforms</h2>
        <Suspense fallback={
          <div className="flex flex-col gap-4">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        }>
          <ConnectedAccounts />
        </Suspense>
      </div>
    </div>
  );
}

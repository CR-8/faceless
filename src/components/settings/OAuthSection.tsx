'use client';

import { useRouter } from 'next/navigation';
import { OAuthProviderCard } from './OAuthProviderCard';

interface ConnectedAccount {
  provider: 'youtube' | 'instagram';
  display_name: string | null;
}

interface OAuthSectionProps {
  accounts: ConnectedAccount[];
}

export function OAuthSection({ accounts }: OAuthSectionProps) {
  const router = useRouter();

  const isConnected = (provider: string) => accounts.some(a => a.provider === provider);
  const displayName = (provider: string) => accounts.find(a => a.provider === provider)?.display_name ?? null;

  const handleDisconnect = async (provider: string) => {
    await fetch(`/api/oauth/${provider}/disconnect`, { method: 'DELETE' });
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-4">
      <OAuthProviderCard
        provider="youtube"
        connected={isConnected('youtube')}
        displayName={displayName('youtube')}
        onConnect={() => { window.location.href = '/api/oauth/youtube'; }}
        onDisconnect={() => handleDisconnect('youtube')}
      />
      <OAuthProviderCard
        provider="instagram"
        connected={isConnected('instagram')}
        displayName={displayName('instagram')}
        onConnect={() => { window.location.href = '/api/oauth/instagram'; }}
        onDisconnect={() => handleDisconnect('instagram')}
      />
    </div>
  );
}

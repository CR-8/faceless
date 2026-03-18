'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle } from 'lucide-react';

interface OAuthProviderCardProps {
  provider: 'youtube' | 'instagram';
  connected: boolean;
  displayName?: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
}

const PROVIDER_LABELS: Record<string, string> = {
  youtube: 'YouTube',
  instagram: 'Instagram',
};

export function OAuthProviderCard({
  provider,
  connected,
  displayName,
  onConnect,
  onDisconnect,
}: OAuthProviderCardProps) {
  const label = PROVIDER_LABELS[provider] ?? provider;

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">{label}</CardTitle>
        {connected ? (
          <Badge variant="outline" className="border-emerald-700 text-emerald-400 text-xs">
            <CheckCircle size={12} className="mr-1" /> Connected
          </Badge>
        ) : (
          <Badge variant="outline" className="border-zinc-700 text-zinc-500 text-xs">
            <XCircle size={12} className="mr-1" /> Not connected
          </Badge>
        )}
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4">
        {connected && displayName ? (
          <p className="text-sm text-zinc-300 truncate">{displayName}</p>
        ) : (
          <p className="text-sm text-zinc-500">Connect your {label} account to enable publishing and analytics.</p>
        )}
        {connected ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onDisconnect}
            className="shrink-0 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            Disconnect
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={onConnect}
            className="shrink-0"
          >
            Connect
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

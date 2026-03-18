'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export function RefreshButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleRefresh = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/analytics/refresh', { method: 'POST' });
      if (res.status === 429) {
        const data = await res.json();
        const next = data.nextRefreshAt ? new Date(data.nextRefreshAt).toLocaleTimeString() : 'soon';
        setMessage(`Next refresh available at ${next}`);
      } else if (!res.ok) {
        setMessage('Refresh failed. Please try again.');
      } else {
        setMessage('Data refreshed.');
        setTimeout(() => setMessage(null), 3000);
      }
    } catch {
      setMessage('Refresh failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        onClick={handleRefresh}
        disabled={loading}
        variant="outline"
        size="sm"
        className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
      >
        <RefreshCw size={14} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
        {loading ? 'Refreshing…' : 'Refresh Data'}
      </Button>
      {message && <p className="text-xs text-zinc-500">{message}</p>}
    </div>
  );
}

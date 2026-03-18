import { Suspense } from 'react';
import { AnalyticsOverview } from '@/components/analytics/AnalyticsOverview';
import { SyncStatusBanner } from '@/components/analytics/SyncStatusBanner';
import { QuotaWarning } from '@/components/analytics/QuotaWarning';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshButton } from '@/components/analytics/RefreshButton';

export default function AnalyticsPage() {
  return (
    <div className="p-6 md:p-8 flex flex-col gap-6 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Analytics</h1>
          <p className="text-zinc-500 text-sm mt-1">Your content performance at a glance.</p>
        </div>
        <RefreshButton />
      </div>

      <Suspense fallback={null}>
        <SyncStatusBanner />
      </Suspense>

      <Suspense fallback={null}>
        <QuotaWarning />
      </Suspense>

      <Suspense fallback={
        <div className="flex flex-col gap-3">
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      }>
        <AnalyticsOverview />
      </Suspense>
    </div>
  );
}

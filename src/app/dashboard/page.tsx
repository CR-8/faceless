import { Suspense } from 'react';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { RecentProjects } from '@/components/dashboard/RecentProjects';
import { PerformanceSnapshot } from '@/components/dashboard/PerformanceSnapshot';
import { ContentPipeline } from '@/components/dashboard/ContentPipeline';
import { SyncStatusBanner } from '@/components/analytics/SyncStatusBanner';
import { Skeleton } from '@/components/ui/skeleton';

function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-lg" />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="p-6 md:p-8 flex flex-col gap-6 max-w-5xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
        <p className="text-zinc-500 text-sm mt-1">Your creator control tower.</p>
      </div>

      <QuickActions />

      <Suspense fallback={null}>
        <SyncStatusBanner />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Suspense fallback={<SectionSkeleton rows={1} />}>
          <PerformanceSnapshot />
        </Suspense>
        <Suspense fallback={<SectionSkeleton rows={1} />}>
          <ContentPipeline />
        </Suspense>
      </div>

      <Suspense fallback={<SectionSkeleton rows={5} />}>
        <RecentProjects />
      </Suspense>
    </div>
  );
}

import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { VideoAnalyticsDetail } from '@/components/analytics/VideoAnalyticsDetail';
import { Skeleton } from '@/components/ui/skeleton';
import { createSupabaseServerClient } from '@/lib/supabase';
import { getVideosForUser, getAnalyticsSummaries } from '@/lib/get-analytics';

interface Props {
  params: Promise<{ videoId: string }>;
}

async function AverageViewCount({ userId }: { userId: string }) {
  const videos = await getVideosForUser(userId);
  if (videos.length === 0) return 0;
  let total = 0;
  for (const v of videos) {
    const summaries = await getAnalyticsSummaries(v.id);
    const latest = summaries.length > 0
      ? summaries.reduce((a, b) => new Date(a.snapshot_timestamp) > new Date(b.snapshot_timestamp) ? a : b)
      : null;
    total += latest?.view_count ?? 0;
  }
  return Math.round(total / videos.length);
}

async function DetailLoader({ videoId }: { videoId: string }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: video } = await supabase.from('videos').select('id').eq('id', videoId).single();
  if (!video) notFound();
  const avg = await AverageViewCount({ userId: user?.id ?? '' });
  return <VideoAnalyticsDetail videoId={videoId} averageViewCount={avg} />;
}

export default async function VideoAnalyticsPage({ params }: Props) {
  const { videoId } = await params;

  return (
    <div className="p-6 md:p-8 flex flex-col gap-6 max-w-3xl mx-auto w-full">
      <Suspense fallback={
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-48 rounded" />
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      }>
        <DetailLoader videoId={videoId} />
      </Suspense>
    </div>
  );
}

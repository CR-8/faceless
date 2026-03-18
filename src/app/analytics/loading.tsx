import { Skeleton } from '@/components/ui/skeleton';

export default function AnalyticsLoading() {
  return (
    <div className="p-8 flex flex-col gap-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-4 gap-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <Skeleton className="h-80 w-full" />
    </div>
  );
}

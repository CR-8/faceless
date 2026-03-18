import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DemoBadge } from '@/components/analytics/DemoBadge';
import { getPerformanceSnapshot } from '@/lib/get-analytics';
import { createSupabaseServerClient } from '@/lib/supabase';
import { Eye, TrendingUp, Trophy } from 'lucide-react';

export async function PerformanceSnapshot() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const snapshot = await getPerformanceSnapshot(user?.id ?? '');

  const metrics = [
    {
      label: 'Views (7 days)',
      value: snapshot.total_views_7d.toLocaleString(),
      icon: Eye,
    },
    {
      label: 'Engagement Rate',
      value: `${snapshot.engagement_rate}%`,
      icon: TrendingUp,
    },
    {
      label: 'Top Video',
      value: snapshot.top_video_title || '—',
      icon: Trophy,
    },
  ];

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
          Performance
        </CardTitle>
        <DemoBadge />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {metrics.map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-zinc-500">
                <Icon size={14} />
                <span className="text-xs">{label}</span>
              </div>
              <p className="text-xl font-bold text-white truncate">{value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

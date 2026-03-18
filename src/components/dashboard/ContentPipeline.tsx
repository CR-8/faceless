import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createSupabaseServerClient } from '@/lib/supabase';
import type { Project } from '@/types/db';
import { FileText, Clock, CheckCircle } from 'lucide-react';

const stages: { status: Project['status']; label: string; icon: React.ElementType; color: string }[] = [
  { status: 'draft', label: 'Draft', icon: FileText, color: 'text-zinc-400' },
  { status: 'scheduled', label: 'Scheduled', icon: Clock, color: 'text-amber-400' },
  { status: 'published', label: 'Published', icon: CheckCircle, color: 'text-emerald-400' },
];

export async function ContentPipeline() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const counts: Record<Project['status'], number> = { draft: 0, scheduled: 0, published: 0 };

  if (user) {
    const { data } = await supabase
      .from('projects')
      .select('status')
      .eq('user_id', user.id);
    for (const row of data ?? []) {
      if (row.status in counts) counts[row.status as Project['status']]++;
    }
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Content Pipeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {stages.map(({ status, label, icon: Icon, color }) => (
            <Link
              key={status}
              href={`/planner?status=${status}`}
              className="flex flex-col items-center gap-2 p-4 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors border border-zinc-800 hover:border-zinc-700"
            >
              <Icon size={20} className={color} />
              <span className="text-2xl font-bold text-white">{counts[status]}</span>
              <span className="text-xs text-zinc-500">{label}</span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

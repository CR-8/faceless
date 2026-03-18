import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createSupabaseServerClient } from '@/lib/supabase';
import type { Project } from '@/types/db';
import { Clock, Play } from 'lucide-react';

const statusColors: Record<Project['status'], string> = {
  draft: 'bg-zinc-700 text-zinc-300',
  scheduled: 'bg-amber-500/20 text-amber-400',
  published: 'bg-emerald-500/20 text-emerald-400',
};

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export async function RecentProjects() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let projects: Project[] = [];
  if (user) {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(5);
    projects = data ?? [];
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Recent Projects</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {projects.length === 0 ? (
          <div className="px-6 pb-6 text-center">
            <p className="text-zinc-500 text-sm">No projects yet.</p>
            <Button asChild variant="outline" size="sm" className="mt-3 border-zinc-700 text-zinc-300">
              <Link href="/studio">Create your first video</Link>
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-800">
            {projects.map((project) => (
              <li key={project.id} className="flex items-center justify-between px-6 py-4 hover:bg-zinc-800/50 transition-colors">
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-sm font-medium text-white truncate">{project.title}</span>
                  <div className="flex items-center gap-2">
                    <Clock size={11} className="text-zinc-600" />
                    <span className="text-xs text-zinc-500">{formatRelativeTime(project.updated_at)}</span>
                    <Badge className={`text-[10px] px-1.5 py-0 ${statusColors[project.status]}`}>
                      {project.status}
                    </Badge>
                  </div>
                </div>
                <Button asChild size="sm" variant="ghost" className="shrink-0 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10">
                  <Link href={`/studio?projectId=${project.id}`}>
                    <Play size={13} className="mr-1" /> Resume
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

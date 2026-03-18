'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Video, CalendarDays, BarChart2 } from 'lucide-react';

const actions = [
  { label: 'Create Video', href: '/studio', icon: Video, description: 'Start a new faceless video' },
  { label: 'Open Planner', href: '/planner', icon: CalendarDays, description: 'Manage your content pipeline' },
  { label: 'View Analytics', href: '/analytics', icon: BarChart2, description: 'See your performance metrics' },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {actions.map(({ label, href, icon: Icon, description }) => (
        <Card key={href} className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
          <CardContent className="p-5">
            <Button asChild variant="ghost" className="w-full h-auto flex-col items-start gap-3 p-0 hover:bg-transparent">
              <Link href={href}>
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Icon size={18} className="text-amber-400" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm text-white">{label}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
                </div>
              </Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

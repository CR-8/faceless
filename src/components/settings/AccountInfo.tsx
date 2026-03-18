import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createSupabaseServerClient } from '@/lib/supabase';
import { User } from 'lucide-react';

export async function AccountInfo() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Account</CardTitle>
      </CardHeader>
      <CardContent>
        {user ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-zinc-700 flex items-center justify-center">
              <User size={16} className="text-zinc-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">{user.email}</p>
              <p className="text-xs text-zinc-500">ID: {user.id.slice(0, 8)}…</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Not signed in.</p>
        )}
      </CardContent>
    </Card>
  );
}

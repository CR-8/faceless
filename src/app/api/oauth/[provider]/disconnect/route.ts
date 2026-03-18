import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';

interface Params {
  params: Promise<{ provider: string }>;
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { provider } = await params;

  if (!['youtube', 'instagram'].includes(provider)) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabase
    .from('accounts')
    .delete()
    .eq('user_id', user.id)
    .eq('provider', provider);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase';

const META_TOKEN_URL = 'https://api.instagram.com/oauth/access_token';
const GRAPH_API = 'https://graph.instagram.com/v19.0';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  // Verify CSRF state
  const cookieStore = await cookies();
  const savedState = cookieStore.get('oauth_state_instagram')?.value;
  cookieStore.delete('oauth_state_instagram');

  if (!state || state !== savedState) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?error=oauth_failed`);
  }

  if (!code) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?error=oauth_failed`);
  }

  // Exchange code for short-lived token
  const tokenRes = await fetch(META_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.INSTAGRAM_CLIENT_ID!,
      client_secret: process.env.INSTAGRAM_CLIENT_SECRET!,
      grant_type: 'authorization_code',
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/instagram/callback`,
      code,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?error=oauth_failed`);
  }

  const shortToken = await tokenRes.json();

  // Exchange for long-lived token
  const longTokenRes = await fetch(
    `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${process.env.INSTAGRAM_CLIENT_SECRET}&access_token=${shortToken.access_token}`
  );
  const longToken = longTokenRes.ok ? await longTokenRes.json() : shortToken;
  const accessToken = longToken.access_token ?? shortToken.access_token;
  const expiresIn = longToken.expires_in ?? 3600;
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  // Fetch Instagram account info
  const meRes = await fetch(
    `${GRAPH_API}/me?fields=id,username&access_token=${accessToken}`
  );
  const me = meRes.ok ? await meRes.json() : {};

  // Upsert account row
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?error=oauth_failed`);
  }

  await supabase.from('accounts').upsert({
    user_id: user.id,
    provider: 'instagram',
    provider_account_id: me.id ?? '',
    display_name: me.username ?? null,
    access_token: accessToken,
    refresh_token: null,
    token_expires_at: expiresAt,
    status: 'connected',
  }, { onConflict: 'user_id,provider' });

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?connected=instagram`);
}

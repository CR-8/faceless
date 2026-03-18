import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const YT_API = 'https://www.googleapis.com/youtube/v3';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  // Verify CSRF state
  const cookieStore = await cookies();
  const savedState = cookieStore.get('oauth_state_youtube')?.value;
  cookieStore.delete('oauth_state_youtube');

  if (!state || state !== savedState) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?error=oauth_failed`);
  }

  if (!code) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?error=oauth_failed`);
  }

  // Exchange code for tokens
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/youtube/callback`,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?error=oauth_failed`);
  }

  const tokens = await tokenRes.json();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  // Fetch channel info
  const channelRes = await fetch(
    `${YT_API}/channels?part=snippet&mine=true`,
    { headers: { Authorization: `Bearer ${tokens.access_token}` } }
  );
  const channelData = await channelRes.json();
  const channel = channelData.items?.[0];
  const channelId = channel?.id ?? '';
  const displayName = channel?.snippet?.title ?? null;

  // Upsert account row
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?error=oauth_failed`);
  }

  await supabase.from('accounts').upsert({
    user_id: user.id,
    provider: 'youtube',
    provider_account_id: channelId,
    display_name: displayName,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? null,
    token_expires_at: expiresAt,
    status: 'connected',
  }, { onConflict: 'user_id,provider' });

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?connected=youtube`);
}

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';

// Graph API OAuth — supports instagram_manage_insights (requires business/creator account)
const META_AUTH_URL = 'https://www.facebook.com/v19.0/dialog/oauth';

export async function GET() {
  const state = randomBytes(16).toString('hex');

  const cookieStore = await cookies();
  cookieStore.set('oauth_state_instagram', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10,
    path: '/',
  });

  const params = new URLSearchParams({
    client_id: process.env.INSTAGRAM_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/instagram/callback`,
    response_type: 'code',
    scope: 'instagram_basic,instagram_manage_insights,pages_show_list',
    state,
  });

  return NextResponse.redirect(`${META_AUTH_URL}?${params}`);
}

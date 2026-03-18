import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';

interface PublishRequest {
  projectId: string;
  platforms: Array<'youtube' | 'instagram'>;
  outputUrl: string;
}

interface PlatformResult {
  platform: string;
  success: boolean;
  videoId?: string;
  error?: string;
  existing?: boolean;
}

async function uploadToPlatform(
  _platform: string,
  _outputUrl: string,
  _account: { access_token: string }
): Promise<string> {
  // Stub — real upload logic implemented when platform SDKs are integrated
  throw new Error('Upload not yet implemented for this platform');
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: PublishRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { projectId, platforms, outputUrl } = body;
  if (!projectId || !platforms?.length || !outputUrl) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const results: PlatformResult[] = [];
  let anySuccess = false;

  // Process platforms in parallel
  await Promise.all(
    platforms.map(async (platform) => {
      // Check for existing video record (idempotency)
      const { data: existing } = await supabase
        .from('videos')
        .select('id, platform_video_id')
        .eq('project_id', projectId)
        .eq('platform', platform)
        .maybeSingle();

      if (existing) {
        results.push({ platform, success: true, videoId: existing.platform_video_id, existing: true });
        anySuccess = true;
        return;
      }

      // Get connected account for this platform
      const { data: account } = await supabase
        .from('accounts')
        .select('id, access_token')
        .eq('user_id', user.id)
        .eq('provider', platform)
        .eq('status', 'connected')
        .maybeSingle();

      if (!account) {
        results.push({ platform, success: false, error: `No connected ${platform} account` });
        return;
      }

      try {
        const platformVideoId = await uploadToPlatform(platform, outputUrl, account);

        // Insert video record
        await supabase.from('videos').insert({
          user_id: user.id,
          project_id: projectId,
          platform,
          platform_video_id: platformVideoId,
          title: `Published video`,
          published_at: new Date().toISOString(),
        });

        results.push({ platform, success: true, videoId: platformVideoId });
        anySuccess = true;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        results.push({ platform, success: false, error: msg });
      }
    })
  );

  // Update project status if at least one platform succeeded
  if (anySuccess) {
    await supabase
      .from('projects')
      .update({ status: 'published', published_at: new Date().toISOString() })
      .eq('id', projectId)
      .eq('user_id', user.id);
  }

  return NextResponse.json({ results });
}

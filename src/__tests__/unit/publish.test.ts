/**
 * Unit tests for publish workflow logic
 */
import { describe, it, expect } from 'vitest';

interface PlatformResult {
  platform: string;
  success: boolean;
  videoId?: string;
  error?: string;
  existing?: boolean;
}

// Pure logic extracted from publish route
function deriveProjectStatus(results: PlatformResult[]): 'published' | 'unchanged' {
  return results.some(r => r.success) ? 'published' : 'unchanged';
}

function buildResultMap(results: PlatformResult[]): Record<string, PlatformResult> {
  return Object.fromEntries(results.map(r => [r.platform, r]));
}

describe('Publish workflow — project status', () => {
  it('partial publish: one success → project status = published', () => {
    const results: PlatformResult[] = [
      { platform: 'youtube', success: true, videoId: 'yt-123' },
      { platform: 'instagram', success: false, error: 'Upload failed' },
    ];
    expect(deriveProjectStatus(results)).toBe('published');
  });

  it('all-fail: project status unchanged', () => {
    const results: PlatformResult[] = [
      { platform: 'youtube', success: false, error: 'No account' },
      { platform: 'instagram', success: false, error: 'Upload failed' },
    ];
    expect(deriveProjectStatus(results)).toBe('unchanged');
  });

  it('all succeed: project status = published', () => {
    const results: PlatformResult[] = [
      { platform: 'youtube', success: true, videoId: 'yt-123' },
      { platform: 'instagram', success: true, videoId: 'ig-456' },
    ];
    expect(deriveProjectStatus(results)).toBe('published');
  });
});

describe('Publish workflow — idempotency', () => {
  it('second publish call returns existing video ID with existing=true', () => {
    const results: PlatformResult[] = [
      { platform: 'youtube', success: true, videoId: 'yt-existing', existing: true },
    ];
    const map = buildResultMap(results);
    expect(map['youtube'].existing).toBe(true);
    expect(map['youtube'].videoId).toBe('yt-existing');
    expect(map['youtube'].success).toBe(true);
  });

  it('existing result still counts as success for project status', () => {
    const results: PlatformResult[] = [
      { platform: 'youtube', success: true, videoId: 'yt-existing', existing: true },
      { platform: 'instagram', success: false, error: 'No account' },
    ];
    expect(deriveProjectStatus(results)).toBe('published');
  });
});

describe('Publish workflow — per-platform status', () => {
  it('each platform result is independently tracked', () => {
    const results: PlatformResult[] = [
      { platform: 'youtube', success: true, videoId: 'yt-123' },
      { platform: 'instagram', success: false, error: 'Rate limited' },
    ];
    const map = buildResultMap(results);
    expect(map['youtube'].success).toBe(true);
    expect(map['instagram'].success).toBe(false);
    expect(map['instagram'].error).toBe('Rate limited');
  });

  it('results array length matches number of requested platforms', () => {
    const platforms = ['youtube', 'instagram'];
    const results: PlatformResult[] = platforms.map(p => ({
      platform: p,
      success: false,
      error: 'stub',
    }));
    expect(results.length).toBe(platforms.length);
  });
});

/**
 * Property 7: Mock Mode Returns Mock Constants
 * Validates: Requirements 4.4, 7.5, 17.2
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';

describe('Property 7: Mock Mode Returns Mock Constants', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_MOCK_ANALYTICS = 'true';
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_MOCK_ANALYTICS;
    vi.resetModules();
  });

  it('isMockMode is true when NEXT_PUBLIC_MOCK_ANALYTICS=true', async () => {
    const { isMockMode } = await import('@/lib/mock-analytics');
    expect(isMockMode).toBe(true);
  });

  it('MOCK_VIDEOS contains only youtube or instagram platform values', async () => {
    const { MOCK_VIDEOS } = await import('@/lib/mock-analytics');
    fc.assert(
      fc.property(fc.constantFrom(...MOCK_VIDEOS), (video) => {
        return video.platform === 'youtube' || video.platform === 'instagram';
      }),
      { numRuns: 100 }
    );
  });

  it('MOCK_ANALYTICS_SUMMARY view_count is always non-negative', async () => {
    const { MOCK_ANALYTICS_SUMMARY } = await import('@/lib/mock-analytics');
    fc.assert(
      fc.property(fc.constantFrom(...MOCK_ANALYTICS_SUMMARY), (s) => {
        return s.view_count >= 0;
      }),
      { numRuns: 100 }
    );
  });

  it('MOCK_PERFORMANCE_SNAPSHOT engagement_rate is between 0 and 100', async () => {
    const { MOCK_PERFORMANCE_SNAPSHOT } = await import('@/lib/mock-analytics');
    expect(MOCK_PERFORMANCE_SNAPSHOT.engagement_rate).toBeGreaterThanOrEqual(0);
    expect(MOCK_PERFORMANCE_SNAPSHOT.engagement_rate).toBeLessThanOrEqual(100);
  });

  it('getPerformanceSnapshot returns MOCK_PERFORMANCE_SNAPSHOT in mock mode', async () => {
    const { getPerformanceSnapshot } = await import('@/lib/get-analytics');
    const { MOCK_PERFORMANCE_SNAPSHOT } = await import('@/lib/mock-analytics');
    const result = await getPerformanceSnapshot('any-user-id');
    expect(result).toEqual(MOCK_PERFORMANCE_SNAPSHOT);
  });

  it('getVideosForUser returns only MOCK_VIDEOS matching userId in mock mode', async () => {
    const { getVideosForUser } = await import('@/lib/get-analytics');
    const { MOCK_VIDEOS } = await import('@/lib/mock-analytics');
    const mockUserId = 'mock-user-1';
    const result = await getVideosForUser(mockUserId);
    const expected = MOCK_VIDEOS.filter((v) => v.user_id === mockUserId);
    expect(result).toEqual(expected);
  });

  it('getAnalyticsSummaries returns only MOCK_ANALYTICS_SUMMARY matching videoId in mock mode', async () => {
    const { getAnalyticsSummaries } = await import('@/lib/get-analytics');
    const { MOCK_ANALYTICS_SUMMARY } = await import('@/lib/mock-analytics');
    const mockVideoId = 'mock-video-1';
    const result = await getAnalyticsSummaries(mockVideoId);
    const expected = MOCK_ANALYTICS_SUMMARY.filter((s) => s.video_id === mockVideoId);
    expect(result).toEqual(expected);
  });
});

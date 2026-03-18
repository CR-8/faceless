/**
 * Property 24: Mock Data Structure Matches Real API Shape
 * Validates: Requirements 17.3
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { MOCK_VIDEOS, MOCK_ANALYTICS_SUMMARY, MOCK_PERFORMANCE_SNAPSHOT } from '@/lib/mock-analytics';

describe('Property 24: Mock Data Structure Matches Real API Shape', () => {
  it('every MOCK_VIDEO has all required Video fields with correct types', () => {
    fc.assert(
      fc.property(fc.constantFrom(...MOCK_VIDEOS), (video) => {
        expect(typeof video.id).toBe('string');
        expect(typeof video.user_id).toBe('string');
        expect(typeof video.platform).toBe('string');
        expect(['youtube', 'instagram']).toContain(video.platform);
        expect(typeof video.platform_video_id).toBe('string');
        expect(typeof video.title).toBe('string');
        expect(typeof video.created_at).toBe('string');
        // nullable fields
        expect(video.project_id === null || typeof video.project_id === 'string').toBe(true);
        expect(video.published_at === null || typeof video.published_at === 'string').toBe(true);
        expect(video.duration_seconds === null || typeof video.duration_seconds === 'number').toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('every MOCK_ANALYTICS_SUMMARY has all required AnalyticsSummary fields with correct types', () => {
    fc.assert(
      fc.property(fc.constantFrom(...MOCK_ANALYTICS_SUMMARY), (summary) => {
        expect(typeof summary.id).toBe('string');
        expect(typeof summary.video_id).toBe('string');
        expect(typeof summary.snapshot_timestamp).toBe('string');
        expect(typeof summary.view_count).toBe('number');
        expect(typeof summary.like_count).toBe('number');
        expect(typeof summary.comment_count).toBe('number');
        expect(typeof summary.share_count).toBe('number');
        expect(typeof summary.avg_view_duration_secs).toBe('number');
        expect(summary.view_count).toBeGreaterThanOrEqual(0);
        expect(summary.like_count).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 100 }
    );
  });

  it('MOCK_PERFORMANCE_SNAPSHOT has all required PerformanceSnapshot fields', () => {
    expect(typeof MOCK_PERFORMANCE_SNAPSHOT.total_views_7d).toBe('number');
    expect(typeof MOCK_PERFORMANCE_SNAPSHOT.engagement_rate).toBe('number');
    expect(typeof MOCK_PERFORMANCE_SNAPSHOT.top_video_title).toBe('string');
    expect(MOCK_PERFORMANCE_SNAPSHOT.total_views_7d).toBeGreaterThanOrEqual(0);
    expect(MOCK_PERFORMANCE_SNAPSHOT.engagement_rate).toBeGreaterThanOrEqual(0);
  });
});

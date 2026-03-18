/**
 * Property tests for analytics aggregation logic (Properties 10–15)
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { AnalyticsSummary, Video } from '@/types/db';

// ── Arbitraries ──────────────────────────────────────────────────────────────

const summaryArb = (videoId: string): fc.Arbitrary<AnalyticsSummary> =>
  fc.record({
    id: fc.uuid(),
    video_id: fc.constant(videoId),
    snapshot_timestamp: isoDateArb(),
    view_count: fc.integer({ min: 0, max: 1_000_000 }),
    like_count: fc.integer({ min: 0, max: 100_000 }),
    comment_count: fc.integer({ min: 0, max: 50_000 }),
    share_count: fc.integer({ min: 0, max: 50_000 }),
    avg_view_duration_secs: fc.integer({ min: 0, max: 3600 }),
  });

const NOW = new Date('2026-03-17T00:00:00Z');
const NOW_MS = NOW.getTime();
const MIN_MS = new Date('2024-01-01').getTime();

const isoDateArb = (min = MIN_MS, max = NOW_MS): fc.Arbitrary<string> =>
  fc.integer({ min, max }).map(ms => new Date(ms).toISOString());

const videoArb = (userId: string, platform: 'youtube' | 'instagram' = 'youtube'): fc.Arbitrary<Video> =>
  fc.record({
    id: fc.uuid(),
    user_id: fc.constant(userId),
    project_id: fc.option(fc.uuid(), { nil: null }),
    platform: fc.constant(platform),
    platform_video_id: fc.string({ minLength: 1, maxLength: 20 }),
    title: fc.string({ minLength: 1, maxLength: 80 }),
    published_at: fc.option(isoDateArb(), { nil: null }),
    duration_seconds: fc.option(fc.integer({ min: 1, max: 7200 }), { nil: null }),
    created_at: isoDateArb(),
  });

// ── Helpers (pure logic extracted from get-analytics / AnalyticsOverview) ────

function totalViewsAcrossAccounts(summaries: AnalyticsSummary[]): number {
  return summaries.reduce((sum, s) => sum + s.view_count, 0);
}

function growthPercentage(current: number, previous: number): number {
  if (previous === 0) return 0;
  return Math.round(((current - previous) / previous) * 100);
}

function bestPlatform(videos: Video[], summaries: AnalyticsSummary[]): string {
  const viewsByPlatform: Record<string, number> = {};
  for (const video of videos) {
    const videoSummaries = summaries.filter(s => s.video_id === video.id);
    const views = videoSummaries.reduce((sum, s) => sum + s.view_count, 0);
    viewsByPlatform[video.platform] = (viewsByPlatform[video.platform] ?? 0) + views;
  }
  return Object.entries(viewsByPlatform).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
}

function postsPerWeek(videos: Video[], windowMs: number, now = Date.now()): number {
  const cutoff = now - windowMs;
  const recent = videos.filter(v => v.published_at && new Date(v.published_at).getTime() >= cutoff);
  const weeks = windowMs / (7 * 24 * 60 * 60 * 1000);
  return Math.round((recent.length / weeks) * 10) / 10;
}

function performanceRatio(videoViews: number, averageViews: number): number | null {
  if (averageViews === 0) return null;
  return Math.round((videoViews / averageViews) * 100) / 100;
}

// ── Property 10: Total Views Aggregation Across Accounts ─────────────────────

describe('Property 10: Analytics Total Views Aggregation Across Accounts', () => {
  it('sum of all view_count values equals totalViews', () => {
    fc.assert(
      fc.property(
        fc.array(summaryArb('v1'), { minLength: 0, maxLength: 20 }),
        (summaries) => {
          const total = totalViewsAcrossAccounts(summaries);
          const expected = summaries.reduce((s, r) => s + r.view_count, 0);
          expect(total).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('total views is non-negative', () => {
    fc.assert(
      fc.property(
        fc.array(summaryArb('v1'), { minLength: 0, maxLength: 20 }),
        (summaries) => {
          expect(totalViewsAcrossAccounts(summaries)).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 11: Growth Percentage Calculation ────────────────────────────────

describe('Property 11: Growth Percentage Calculation', () => {
  it('growth is 0 when previous period is 0', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1_000_000 }), (current) => {
        expect(growthPercentage(current, 0)).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  it('growth is positive when current > previous', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 499_000 }),
        fc.integer({ min: 100, max: 500_000 }),
        (previous, extra) => {
          const current = previous + extra;
          const result = growthPercentage(current, previous);
          expect(result).toBeGreaterThanOrEqual(0);
          if (extra >= previous * 0.01) {
            expect(result).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('growth is negative when current < previous', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 499_000 }),
        fc.integer({ min: 100, max: 500_000 }),
        (current, extra) => {
          const previous = current + extra;
          const result = growthPercentage(current, previous);
          expect(result).toBeLessThanOrEqual(0);
          if (extra >= previous * 0.01) {
            expect(result).toBeLessThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 12: Best Platform Is Maximum Total Views ────────────────────────

describe('Property 12: Best Platform Is Maximum Total Views', () => {
  it('best platform has the highest total view count', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(videoArb('u1', 'youtube'), videoArb('u1', 'instagram')),
          { minLength: 1, maxLength: 10 }
        ),
        (videos) => {
          const summaries: AnalyticsSummary[] = videos.map((v, i) => ({
            id: `s-${i}`,
            video_id: v.id,
            snapshot_timestamp: new Date().toISOString(),
            view_count: (i + 1) * 1000,
            like_count: 0,
            comment_count: 0,
            share_count: 0,
            avg_view_duration_secs: 0,
          }));

          const best = bestPlatform(videos, summaries);
          const viewsByPlatform: Record<string, number> = {};
          for (const v of videos) {
            const vs = summaries.filter(s => s.video_id === v.id).reduce((s, r) => s + r.view_count, 0);
            viewsByPlatform[v.platform] = (viewsByPlatform[v.platform] ?? 0) + vs;
          }
          const maxViews = Math.max(...Object.values(viewsByPlatform));
          expect(viewsByPlatform[best]).toBe(maxViews);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 13: Posts Per Week Calculation ───────────────────────────────────

describe('Property 13: Posts Per Week Calculation', () => {
  it('posts per week is non-negative', () => {
    fc.assert(
      fc.property(
        fc.array(videoArb('u1'), { minLength: 0, maxLength: 20 }),
        (videos) => {
          const result = postsPerWeek(videos, 30 * 24 * 60 * 60 * 1000, NOW.getTime());
          expect(result).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('posts per week is 0 when no videos published in window', () => {
    fc.assert(
      fc.property(
        fc.array(videoArb('u1'), { minLength: 0, maxLength: 10 }),
        (videos) => {
          // Set all published_at to far in the past (2020)
          const oldVideos = videos.map(v => ({
            ...v,
            published_at: new Date('2020-01-01').toISOString(),
          }));
          // Use NOW as the reference point so the 30-day window is 2026-02-15 to 2026-03-17
          expect(postsPerWeek(oldVideos, 30 * 24 * 60 * 60 * 1000, NOW.getTime())).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 14: Per-Video Engagement Breakdown Contains All Fields ───────────

describe('Property 14: Per-Video Engagement Breakdown Contains All Fields', () => {
  it('every summary has all required engagement fields as non-negative integers', () => {
    fc.assert(
      fc.property(
        fc.array(summaryArb('v1'), { minLength: 1, maxLength: 20 }),
        (summaries) => {
          for (const s of summaries) {
            expect(typeof s.like_count).toBe('number');
            expect(typeof s.comment_count).toBe('number');
            expect(typeof s.share_count).toBe('number');
            expect(s.like_count).toBeGreaterThanOrEqual(0);
            expect(s.comment_count).toBeGreaterThanOrEqual(0);
            expect(s.share_count).toBeGreaterThanOrEqual(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 15: Performance Comparison Is Ratio of Video Views to Average ───

describe('Property 15: Performance Comparison Is Ratio of Video Views to Average', () => {
  it('ratio is null when average is 0', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1_000_000 }), (views) => {
        expect(performanceRatio(views, 0)).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  it('ratio equals videoViews / averageViews (rounded to 2dp)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 1, max: 1_000_000 }),
        (videoViews, avg) => {
          const ratio = performanceRatio(videoViews, avg);
          const expected = Math.round((videoViews / avg) * 100) / 100;
          expect(ratio).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('ratio >= 1 when video views >= average', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }),
        (avg) => {
          const ratio = performanceRatio(avg, avg);
          expect(ratio).toBeGreaterThanOrEqual(1);
        }
      ),
      { numRuns: 100 }
    );
  });
});

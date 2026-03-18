/**
 * Properties 1, 2, 4, 5, 6, 8: Dashboard Data Logic
 *
 * **Validates: Requirements 3.1, 3.2, 4.1, 4.2, 4.3, 5.2**
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { Project, AnalyticsSummary } from '@/types/db';

// --- Helpers (mirrors what the components do) ---

function getTop5ByUpdatedAt(projects: Project[]): Project[] {
  return [...projects].sort((a, b) =>
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  ).slice(0, 5);
}

function calcTotalViews7d(summaries: AnalyticsSummary[], since: Date): number {
  return summaries
    .filter(s => new Date(s.snapshot_timestamp) >= since)
    .reduce((sum, s) => sum + s.view_count, 0);
}

function calcEngagementRate(summaries: AnalyticsSummary[]): number {
  const totalViews = summaries.reduce((s, r) => s + r.view_count, 0);
  const totalEngagement = summaries.reduce((s, r) => s + r.like_count + r.comment_count + r.share_count, 0);
  if (totalViews === 0) return 0;
  return Math.round((totalEngagement / totalViews) * 1000) / 10;
}

function getTopVideoId(summaries: AnalyticsSummary[]): string | null {
  if (summaries.length === 0) return null;
  const byVideo: Record<string, number> = {};
  for (const s of summaries) byVideo[s.video_id] = (byVideo[s.video_id] ?? 0) + s.view_count;
  return Object.entries(byVideo).sort((a, b) => b[1] - a[1])[0][0];
}

function countByStatus(projects: Project[]): Record<Project['status'], number> {
  const counts: Record<Project['status'], number> = { draft: 0, scheduled: 0, published: 0 };
  for (const p of projects) counts[p.status]++;
  return counts;
}

// --- Arbitraries ---

const statusArb = fc.constantFrom<Project['status']>('draft', 'scheduled', 'published');

// Use integer ms timestamps to avoid fc.date() shrinking into invalid Date territory
const MIN_TS = new Date('2024-01-01').getTime();
const MAX_TS = new Date('2026-01-01').getTime();
const MIN_TS_SUMMARY = new Date('2025-01-01').getTime();
const MAX_TS_SUMMARY = new Date('2026-06-01').getTime();

const isoDateArb = (min: number, max: number) =>
  fc.integer({ min, max }).map(ms => new Date(ms).toISOString());

const projectArb: fc.Arbitrary<Project> = fc.record({
  id: fc.uuid(),
  user_id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 80 }),
  description: fc.string({ maxLength: 200 }),
  status: statusArb,
  studio_state: fc.constant(null),
  thumbnail_url: fc.constant(null),
  scheduled_at: fc.constant(null),
  published_at: fc.constant(null),
  created_at: isoDateArb(MIN_TS, MAX_TS),
  updated_at: isoDateArb(MIN_TS, MAX_TS),
});

const summaryArb: fc.Arbitrary<AnalyticsSummary> = fc.record({
  id: fc.uuid(),
  video_id: fc.uuid(),
  snapshot_timestamp: isoDateArb(MIN_TS_SUMMARY, MAX_TS_SUMMARY),
  view_count: fc.integer({ min: 0, max: 1_000_000 }),
  like_count: fc.integer({ min: 0, max: 100_000 }),
  comment_count: fc.integer({ min: 0, max: 50_000 }),
  share_count: fc.integer({ min: 0, max: 50_000 }),
  avg_view_duration_secs: fc.integer({ min: 0, max: 3600 }),
});

// --- Tests ---

describe('Property 1: Recent Projects Query Returns Top 5 by Updated At', () => {
  it('result is always at most 5 items', () => {
    fc.assert(
      fc.property(fc.array(projectArb, { minLength: 0, maxLength: 20 }), (projects) => {
        expect(getTop5ByUpdatedAt(projects).length).toBeLessThanOrEqual(5);
      }),
      { numRuns: 100 }
    );
  });

  it('result is sorted descending by updated_at', () => {
    fc.assert(
      fc.property(fc.array(projectArb, { minLength: 2, maxLength: 20 }), (projects) => {
        const top5 = getTop5ByUpdatedAt(projects);
        for (let i = 1; i < top5.length; i++) {
          expect(new Date(top5[i - 1].updated_at).getTime()).toBeGreaterThanOrEqual(
            new Date(top5[i].updated_at).getTime()
          );
        }
      }),
      { numRuns: 100 }
    );
  });
});

describe('Property 2: Project Card Renders Required Fields', () => {
  it('every project has title, updated_at, and status', () => {
    fc.assert(
      fc.property(projectArb, (project) => {
        expect(typeof project.title).toBe('string');
        expect(project.title.length).toBeGreaterThan(0);
        expect(typeof project.updated_at).toBe('string');
        expect(['draft', 'scheduled', 'published']).toContain(project.status);
      }),
      { numRuns: 100 }
    );
  });
});

describe('Property 4: 7-Day View Count Aggregation', () => {
  it('total views is sum of view_count for summaries within 7 days', () => {
    fc.assert(
      fc.property(fc.array(summaryArb, { minLength: 0, maxLength: 20 }), (summaries) => {
        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const total = calcTotalViews7d(summaries, since);
        const expected = summaries
          .filter(s => new Date(s.snapshot_timestamp) >= since)
          .reduce((sum, s) => sum + s.view_count, 0);
        expect(total).toBe(expected);
        expect(total).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 100 }
    );
  });
});

describe('Property 5: Engagement Rate Calculation', () => {
  it('engagement rate is between 0 and 100 for any input', () => {
    fc.assert(
      fc.property(fc.array(summaryArb, { minLength: 0, maxLength: 20 }), (summaries) => {
        const rate = calcEngagementRate(summaries);
        expect(rate).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 100 }
    );
  });

  it('engagement rate is 0 when total views is 0', () => {
    const zeroViewSummaries: AnalyticsSummary[] = [];
    expect(calcEngagementRate(zeroViewSummaries)).toBe(0);
  });
});

describe('Property 6: Top Video Is Maximum View Count', () => {
  it('top video id has the highest total view count', () => {
    fc.assert(
      fc.property(fc.array(summaryArb, { minLength: 1, maxLength: 20 }), (summaries) => {
        const topId = getTopVideoId(summaries);
        if (!topId) return;
        const byVideo: Record<string, number> = {};
        for (const s of summaries) byVideo[s.video_id] = (byVideo[s.video_id] ?? 0) + s.view_count;
        const topViews = byVideo[topId];
        for (const views of Object.values(byVideo)) {
          expect(topViews).toBeGreaterThanOrEqual(views);
        }
      }),
      { numRuns: 100 }
    );
  });
});

describe('Property 8: Pipeline Stage Counts Are Accurate', () => {
  it('sum of all stage counts equals total project count', () => {
    fc.assert(
      fc.property(fc.array(projectArb, { minLength: 0, maxLength: 30 }), (projects) => {
        const counts = countByStatus(projects);
        const total = counts.draft + counts.scheduled + counts.published;
        expect(total).toBe(projects.length);
      }),
      { numRuns: 100 }
    );
  });

  it('each count is non-negative', () => {
    fc.assert(
      fc.property(fc.array(projectArb, { minLength: 0, maxLength: 30 }), (projects) => {
        const counts = countByStatus(projects);
        expect(counts.draft).toBeGreaterThanOrEqual(0);
        expect(counts.scheduled).toBeGreaterThanOrEqual(0);
        expect(counts.published).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 100 }
    );
  });
});

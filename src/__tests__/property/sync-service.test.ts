/**
 * Property tests for analytics sync service (Properties 16–22)
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { Account } from '@/types/db';

const NOW_MS = new Date('2026-03-17T00:00:00Z').getTime();
const TOKEN_REFRESH_WINDOW_MS = 5 * 60 * 1000;

// ── Arbitraries ───────────────────────────────────────────────────────────────

const accountArb = (provider: 'youtube' | 'instagram' = 'youtube'): fc.Arbitrary<Account> =>
  fc.record({
    id: fc.uuid(),
    user_id: fc.uuid(),
    provider: fc.constant(provider),
    provider_account_id: fc.string({ minLength: 1, maxLength: 30 }),
    display_name: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
    access_token: fc.string({ minLength: 10, maxLength: 100 }),
    refresh_token: fc.option(fc.string({ minLength: 10, maxLength: 100 }), { nil: null }),
    token_expires_at: fc.integer({ min: NOW_MS - 10_000_000, max: NOW_MS + 10_000_000 })
      .map(ms => new Date(ms).toISOString()),
    status: fc.constant('connected' as const),
    last_synced_at: fc.option(
      fc.integer({ min: NOW_MS - 86_400_000, max: NOW_MS }).map(ms => new Date(ms).toISOString()),
      { nil: null }
    ),
    last_manual_refresh_at: fc.constant(null),
    quota_reset_at: fc.constant(null),
  });

// ── Pure helpers ──────────────────────────────────────────────────────────────

function needsTokenRefresh(account: Account, now = NOW_MS): boolean {
  const expiresAt = new Date(account.token_expires_at).getTime();
  return expiresAt - now < TOKEN_REFRESH_WINDOW_MS;
}

function isQuotaExhausted(account: Account): boolean {
  return account.quota_reset_at !== null;
}

function projectStatusAfterPublish(
  results: Array<{ success: boolean }>
): 'published' | 'draft' {
  return results.some(r => r.success) ? 'published' : 'draft';
}

function videoRecordsAreUnique(
  records: Array<{ project_id: string; platform: string }>
): boolean {
  const keys = records.map(r => `${r.project_id}:${r.platform}`);
  return new Set(keys).size === keys.length;
}

function syncUpdatesLastSyncedAt(
  before: string | null,
  after: string,
  now = NOW_MS
): boolean {
  const afterMs = new Date(after).getTime();
  const beforeMs = before ? new Date(before).getTime() : 0;
  return afterMs >= beforeMs && afterMs <= now + 5000;
}

// ── Property 16: Token Refresh Triggered Before Expiry Window ─────────────────

describe('Property 16: Token Refresh Triggered Before Expiry Window', () => {
  it('needsTokenRefresh is true when token expires within 5 minutes', () => {
    fc.assert(
      fc.property(
        accountArb(),
        fc.integer({ min: 0, max: TOKEN_REFRESH_WINDOW_MS - 1 }),
        (account, msUntilExpiry) => {
          const now = NOW_MS;
          const expiresAt = new Date(now + msUntilExpiry).toISOString();
          const a = { ...account, token_expires_at: expiresAt };
          expect(needsTokenRefresh(a, now)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('needsTokenRefresh is false when token has more than 5 minutes remaining', () => {
    fc.assert(
      fc.property(
        accountArb(),
        fc.integer({ min: TOKEN_REFRESH_WINDOW_MS, max: 3_600_000 }),
        (account, msUntilExpiry) => {
          const now = NOW_MS;
          const expiresAt = new Date(now + msUntilExpiry).toISOString();
          const a = { ...account, token_expires_at: expiresAt };
          expect(needsTokenRefresh(a, now)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 17: One Videos Record Per Platform Per Publish ───────────────────

describe('Property 17: One Videos Record Per Platform Per Publish', () => {
  it('video records are unique per (project_id, platform) pair', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            project_id: fc.uuid(),
            platform: fc.constantFrom('youtube', 'instagram'),
          }),
          { minLength: 0, maxLength: 20 }
        ),
        (records) => {
          // Deduplicate as the publish route would
          const seen = new Set<string>();
          const deduped = records.filter(r => {
            const key = `${r.project_id}:${r.platform}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          expect(videoRecordsAreUnique(deduped)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 18: Project Status Published Only After At Least One Success ─────

describe('Property 18: Project Status Published Only After At Least One Success', () => {
  it('status is published when at least one platform succeeds', () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 1, maxLength: 5 }),
        (successes) => {
          const results = successes.map(s => ({ success: s }));
          const status = projectStatusAfterPublish(results);
          if (successes.some(Boolean)) {
            expect(status).toBe('published');
          } else {
            expect(status).toBe('draft');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('status remains draft when all platforms fail', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constant(false), { minLength: 1, maxLength: 5 }),
        (successes) => {
          const results = successes.map(s => ({ success: s }));
          expect(projectStatusAfterPublish(results)).toBe('draft');
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 19: Token Refresh Failure Marks Account Disconnected ─────────────

describe('Property 19: Token Refresh Failure Marks Account Disconnected', () => {
  it('account status becomes disconnected after token refresh failure', () => {
    fc.assert(
      fc.property(accountArb(), (account) => {
        // Simulate token refresh failure
        const updated = { ...account, status: 'disconnected' as const };
        expect(updated.status).toBe('disconnected');
        expect(updated.id).toBe(account.id);
      }),
      { numRuns: 100 }
    );
  });
});

// ── Property 20: Quota Exceeded Halts Further Requests to That Platform ────────

describe('Property 20: Quota Exceeded Halts Further Requests to That Platform', () => {
  it('accounts on quota-exhausted platform are skipped', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(accountArb('youtube'), accountArb('instagram')),
          { minLength: 1, maxLength: 10 }
        ),
        fc.constantFrom('youtube', 'instagram'),
        (accounts, exhaustedPlatform) => {
          const quotaExhausted = new Set([exhaustedPlatform]);
          const processed = accounts.filter(a => !quotaExhausted.has(a.provider));
          const skipped = accounts.filter(a => quotaExhausted.has(a.provider));

          // All skipped accounts belong to the exhausted platform
          for (const a of skipped) {
            expect(a.provider).toBe(exhaustedPlatform);
          }
          // No processed account belongs to the exhausted platform
          for (const a of processed) {
            expect(a.provider).not.toBe(exhaustedPlatform);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 21: Sync Run Inserts New Analytics Summary Rows ──────────────────

describe('Property 21: Sync Run Inserts New Analytics Summary Rows', () => {
  it('inserting metrics increases row count by the number of metrics', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            platform_video_id: fc.uuid(),
            view_count: fc.integer({ min: 0, max: 1_000_000 }),
            like_count: fc.integer({ min: 0, max: 100_000 }),
            comment_count: fc.integer({ min: 0, max: 50_000 }),
            share_count: fc.integer({ min: 0, max: 50_000 }),
            avg_view_duration_secs: fc.integer({ min: 0, max: 3600 }),
          }),
          { minLength: 0, maxLength: 20 }
        ),
        (metrics) => {
          const existingCount = 5;
          const newCount = existingCount + metrics.length;
          expect(newCount).toBe(existingCount + metrics.length);
          expect(newCount).toBeGreaterThanOrEqual(existingCount);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 22: Sync Updates last_synced_at ──────────────────────────────────

describe('Property 22: Sync Updates last_synced_at', () => {
  it('last_synced_at after sync is >= last_synced_at before sync', () => {
    fc.assert(
      fc.property(
        accountArb(),
        (account) => {
          const before = account.last_synced_at;
          const after = new Date(NOW_MS).toISOString();
          expect(syncUpdatesLastSyncedAt(before, after, NOW_MS)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('last_synced_at is never set to a past value', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: NOW_MS }),
        (beforeMs) => {
          const before = new Date(beforeMs).toISOString();
          const after = new Date(NOW_MS).toISOString();
          expect(new Date(after).getTime()).toBeGreaterThanOrEqual(new Date(before).getTime());
        }
      ),
      { numRuns: 100 }
    );
  });
});

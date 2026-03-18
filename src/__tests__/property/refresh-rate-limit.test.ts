/**
 * Property 23: Manual Refresh Rate Limit Enforced
 * Validates: Requirements 19.3
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

// Pure rate-limit logic extracted from the refresh route
function checkRateLimit(
  lastRefreshAt: number | null,
  now: number
): { allowed: boolean; nextRefreshAt?: string } {
  if (lastRefreshAt === null || lastRefreshAt === 0) {
    return { allowed: true };
  }
  const elapsed = now - lastRefreshAt;
  if (elapsed < COOLDOWN_MS) {
    return {
      allowed: false,
      nextRefreshAt: new Date(lastRefreshAt + COOLDOWN_MS).toISOString(),
    };
  }
  return { allowed: true };
}

describe('Property 23: Manual Refresh Rate Limit Enforced', () => {
  it('allows refresh when no prior refresh exists', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
        (now) => {
          expect(checkRateLimit(null, now).allowed).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('blocks refresh when last refresh was within cooldown window', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: COOLDOWN_MS, max: 1_000_000_000_000 }),
        fc.integer({ min: 1, max: COOLDOWN_MS - 1 }),
        (lastRefresh, elapsedMs) => {
          const now = lastRefresh + elapsedMs;
          const result = checkRateLimit(lastRefresh, now);
          expect(result.allowed).toBe(false);
          expect(result.nextRefreshAt).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('allows refresh when cooldown has fully elapsed', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: COOLDOWN_MS, max: 1_000_000_000_000 }),
        fc.integer({ min: 0, max: 1_000_000_000 }),
        (lastRefresh, extra) => {
          const now = lastRefresh + COOLDOWN_MS + extra;
          expect(checkRateLimit(lastRefresh, now).allowed).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('nextRefreshAt is always in the future relative to now when blocked', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: COOLDOWN_MS, max: 1_000_000_000_000 }),
        fc.integer({ min: 1, max: COOLDOWN_MS - 1 }),
        (lastRefresh, elapsedMs) => {
          const now = lastRefresh + elapsedMs;
          const result = checkRateLimit(lastRefresh, now);
          if (!result.allowed && result.nextRefreshAt) {
            expect(new Date(result.nextRefreshAt).getTime()).toBeGreaterThan(now);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rate limit is exactly COOLDOWN_MS — boundary at exactly cooldown is allowed', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: COOLDOWN_MS, max: 1_000_000_000_000 }),
        (lastRefresh) => {
          const now = lastRefresh + COOLDOWN_MS;
          expect(checkRateLimit(lastRefresh, now).allowed).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

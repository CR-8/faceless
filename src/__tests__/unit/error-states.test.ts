/**
 * Unit tests for error states (Requirements 15.5, 15.6)
 */
import { describe, it, expect } from 'vitest';

interface AccountSyncState {
  status: 'connected' | 'disconnected';
  last_synced_at: string | null;
  quota_reset_at: string | null;
}

type BannerState = 'none' | 'no-data' | 'stale' | 'quota';

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

function deriveBannerState(
  accounts: AccountSyncState[],
  now = Date.now()
): BannerState {
  if (accounts.length === 0) return 'none';

  const hasConnected = accounts.some(a => a.status === 'connected');
  const hasQuota = accounts.some(a => a.quota_reset_at !== null);

  if (hasQuota) return 'quota';

  const lastSynced = accounts
    .map(a => a.last_synced_at ? new Date(a.last_synced_at).getTime() : 0)
    .reduce((max, t) => Math.max(max, t), 0);

  if (hasConnected && lastSynced === 0) return 'no-data';
  if (lastSynced > 0 && lastSynced < now - TWELVE_HOURS_MS) return 'stale';

  return 'none';
}

describe('SyncStatusBanner — error state derivation', () => {
  it('returns "none" when no accounts exist', () => {
    expect(deriveBannerState([])).toBe('none');
  });

  it('returns "no-data" when connected account has never synced', () => {
    const accounts: AccountSyncState[] = [
      { status: 'connected', last_synced_at: null, quota_reset_at: null },
    ];
    expect(deriveBannerState(accounts)).toBe('no-data');
  });

  it('returns "stale" when last sync was more than 12 hours ago', () => {
    const staleTime = new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString();
    const accounts: AccountSyncState[] = [
      { status: 'connected', last_synced_at: staleTime, quota_reset_at: null },
    ];
    expect(deriveBannerState(accounts)).toBe('stale');
  });

  it('returns "none" when last sync was recent', () => {
    const recentTime = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
    const accounts: AccountSyncState[] = [
      { status: 'connected', last_synced_at: recentTime, quota_reset_at: null },
    ];
    expect(deriveBannerState(accounts)).toBe('none');
  });

  it('returns "quota" when any account has quota_reset_at set', () => {
    const accounts: AccountSyncState[] = [
      { status: 'connected', last_synced_at: null, quota_reset_at: new Date().toISOString() },
    ];
    expect(deriveBannerState(accounts)).toBe('quota');
  });

  it('quota takes priority over no-data', () => {
    const accounts: AccountSyncState[] = [
      { status: 'connected', last_synced_at: null, quota_reset_at: new Date().toISOString() },
    ];
    expect(deriveBannerState(accounts)).toBe('quota');
  });

  it('returns "none" for disconnected accounts with no sync data', () => {
    const accounts: AccountSyncState[] = [
      { status: 'disconnected', last_synced_at: null, quota_reset_at: null },
    ];
    // Disconnected accounts don't trigger no-data banner
    expect(deriveBannerState(accounts)).toBe('none');
  });
});

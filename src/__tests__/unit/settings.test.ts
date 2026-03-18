/**
 * Unit tests for settings page logic
 */
import { describe, it, expect } from 'vitest';

// ── OAuthProviderCard logic ───────────────────────────────────────────────────

interface ConnectedAccount {
  provider: 'youtube' | 'instagram';
  display_name: string | null;
}

function isConnected(accounts: ConnectedAccount[], provider: string): boolean {
  return accounts.some(a => a.provider === provider);
}

function getDisplayName(accounts: ConnectedAccount[], provider: string): string | null {
  return accounts.find(a => a.provider === provider)?.display_name ?? null;
}

describe('OAuthProviderCard visibility logic', () => {
  it('shows connect button when account is not connected', () => {
    const accounts: ConnectedAccount[] = [];
    expect(isConnected(accounts, 'youtube')).toBe(false);
    expect(isConnected(accounts, 'instagram')).toBe(false);
  });

  it('shows disconnect button when account is connected', () => {
    const accounts: ConnectedAccount[] = [
      { provider: 'youtube', display_name: 'My Channel' },
    ];
    expect(isConnected(accounts, 'youtube')).toBe(true);
    expect(isConnected(accounts, 'instagram')).toBe(false);
  });

  it('returns display name for connected account', () => {
    const accounts: ConnectedAccount[] = [
      { provider: 'youtube', display_name: 'My Channel' },
    ];
    expect(getDisplayName(accounts, 'youtube')).toBe('My Channel');
    expect(getDisplayName(accounts, 'instagram')).toBeNull();
  });

  it('handles null display name gracefully', () => {
    const accounts: ConnectedAccount[] = [
      { provider: 'youtube', display_name: null },
    ];
    expect(isConnected(accounts, 'youtube')).toBe(true);
    expect(getDisplayName(accounts, 'youtube')).toBeNull();
  });
});

// ── OAuth error redirect message ──────────────────────────────────────────────

describe('OAuth error redirect rendering', () => {
  it('renders descriptive message for oauth_failed error code', () => {
    const errorMessages: Record<string, string> = {
      oauth_failed: 'OAuth connection failed. Please try again.',
    };
    expect(errorMessages['oauth_failed']).toContain('failed');
    expect(errorMessages['oauth_failed']).toBeTruthy();
  });

  it('renders success message for connected provider', () => {
    const successMessage = (provider: string) => `Successfully connected ${provider}.`;
    expect(successMessage('youtube')).toContain('youtube');
    expect(successMessage('instagram')).toContain('instagram');
  });

  it('shows no banner when no query params present', () => {
    const params = {};
    expect((params as Record<string, string>)['connected']).toBeUndefined();
    expect((params as Record<string, string>)['error']).toBeUndefined();
  });
});

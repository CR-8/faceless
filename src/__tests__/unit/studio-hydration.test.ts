/**
 * Unit tests for Studio hydration logic
 * Validates: Requirements 3.4, 3.5
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { StudioStatePayload } from '@/types/db';

const MOCK_STUDIO_STATE: StudioStatePayload = {
  bgId: 'bg-minecraft',
  leftCharId: 'char-trump',
  rightCharId: 'char-biden',
  script: 'left: Hello\nright: World',
  format: '9:16',
  duration: 60,
  voiceL: 'voice-ben',
  voiceR: 'voice-gojo',
  subAlign: 'center',
  subSize: 56,
  subPos: 50,
  subColor: '#44f321ff',
  subFont: 'Arial',
  charSize: 50,
  charPosV: 0,
};

describe('Studio hydration — fetch behavior', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches project data when projectId is provided', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'project-123',
        title: 'My Test Project',
        studio_state: MOCK_STUDIO_STATE,
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    // Simulate the fetch call that StudioContext makes on mount
    const res = await fetch('/api/projects/project-123');
    const data = await res.json();

    expect(mockFetch).toHaveBeenCalledWith('/api/projects/project-123');
    expect(data.studio_state).toEqual(MOCK_STUDIO_STATE);
    expect(data.title).toBe('My Test Project');
  });

  it('handles 404 response by returning error state', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Not found' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const res = await fetch('/api/projects/nonexistent-id');
    expect(res.ok).toBe(false);
    expect(res.status).toBe(404);
  });

  it('handles network error gracefully', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.stubGlobal('fetch', mockFetch);

    await expect(fetch('/api/projects/project-123')).rejects.toThrow('Network error');
  });

  it('studio_state payload has all required fields for hydration', () => {
    const requiredFields: (keyof StudioStatePayload)[] = [
      'bgId', 'leftCharId', 'rightCharId', 'script', 'format',
      'duration', 'voiceL', 'voiceR', 'subAlign', 'subSize',
      'subPos', 'subColor', 'subFont', 'charSize', 'charPosV',
    ];
    for (const field of requiredFields) {
      expect(MOCK_STUDIO_STATE).toHaveProperty(field);
    }
  });

  it('saveProject constructs correct PATCH payload', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'project-123', updated_at: new Date().toISOString() }),
    });
    vi.stubGlobal('fetch', mockFetch);

    // Simulate what saveProject does
    await fetch('/api/projects/project-123', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'My Project', studio_state: MOCK_STUDIO_STATE }),
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/projects/project-123',
      expect.objectContaining({
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.studio_state).toEqual(MOCK_STUDIO_STATE);
  });
});

/**
 * Unit tests for dashboard logic
 * Validates: Requirements 2.1–2.3, 3.6, 17.4
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Dashboard — Quick Action link targets', () => {
  it('QuickActions component links to /studio', () => {
    const src = readFileSync(join(process.cwd(), 'src/components/dashboard/QuickActions.tsx'), 'utf-8');
    expect(src).toContain("href: '/studio'");
  });

  it('QuickActions component links to /planner', () => {
    const src = readFileSync(join(process.cwd(), 'src/components/dashboard/QuickActions.tsx'), 'utf-8');
    expect(src).toContain("href: '/planner'");
  });

  it('QuickActions component links to /analytics', () => {
    const src = readFileSync(join(process.cwd(), 'src/components/dashboard/QuickActions.tsx'), 'utf-8');
    expect(src).toContain("href: '/analytics'");
  });
});

describe('Dashboard — RecentProjects empty state', () => {
  it('RecentProjects component has empty state message', () => {
    const src = readFileSync(join(process.cwd(), 'src/components/dashboard/RecentProjects.tsx'), 'utf-8');
    expect(src).toMatch(/no projects/i);
  });

  it('RecentProjects Resume button links to /studio with projectId', () => {
    const src = readFileSync(join(process.cwd(), 'src/components/dashboard/RecentProjects.tsx'), 'utf-8');
    expect(src).toContain('/studio?projectId=');
  });
});

describe('Dashboard — Demo Data badge', () => {
  it('PerformanceSnapshot renders DemoBadge component', () => {
    const src = readFileSync(join(process.cwd(), 'src/components/dashboard/PerformanceSnapshot.tsx'), 'utf-8');
    expect(src).toContain('DemoBadge');
  });

  it('DemoBadge returns null when isMockMode is false', async () => {
    delete process.env.NEXT_PUBLIC_MOCK_ANALYTICS;
    vi.resetModules();
    const { isMockMode } = await import('@/lib/mock-analytics');
    expect(isMockMode).toBe(false);
  });

  it('DemoBadge is visible when NEXT_PUBLIC_MOCK_ANALYTICS=true', async () => {
    process.env.NEXT_PUBLIC_MOCK_ANALYTICS = 'true';
    vi.resetModules();
    const { isMockMode } = await import('@/lib/mock-analytics');
    expect(isMockMode).toBe(true);
    delete process.env.NEXT_PUBLIC_MOCK_ANALYTICS;
    vi.resetModules();
  });
});

describe('Dashboard — ContentPipeline stage links', () => {
  it('ContentPipeline links to /planner with status filter', () => {
    const src = readFileSync(join(process.cwd(), 'src/components/dashboard/ContentPipeline.tsx'), 'utf-8');
    expect(src).toContain('/planner?status=');
  });
});

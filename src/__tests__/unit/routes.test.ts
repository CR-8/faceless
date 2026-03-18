import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Route redirects', () => {
  it('root page redirects to /dashboard', () => {
    const src = readFileSync(join(process.cwd(), 'src/app/page.tsx'), 'utf-8');
    expect(src).toContain("redirect('/dashboard')");
  });

  it('/projects page redirects to /planner', () => {
    const src = readFileSync(join(process.cwd(), 'src/app/projects/page.tsx'), 'utf-8');
    expect(src).toContain("redirect('/planner')");
  });
});

describe('Route files exist', () => {
  it('studio route exists', () => {
    const src = readFileSync(join(process.cwd(), 'src/app/studio/page.tsx'), 'utf-8');
    expect(src).toBeTruthy();
  });

  it('dashboard route exists', () => {
    const src = readFileSync(join(process.cwd(), 'src/app/dashboard/page.tsx'), 'utf-8');
    expect(src).toBeTruthy();
  });

  it('planner route exists', () => {
    const src = readFileSync(join(process.cwd(), 'src/app/planner/page.tsx'), 'utf-8');
    expect(src).toBeTruthy();
  });

  it('analytics route exists', () => {
    const src = readFileSync(join(process.cwd(), 'src/app/analytics/page.tsx'), 'utf-8');
    expect(src).toBeTruthy();
  });

  it('settings route exists', () => {
    const src = readFileSync(join(process.cwd(), 'src/app/settings/page.tsx'), 'utf-8');
    expect(src).toBeTruthy();
  });
});

'use client';

import { usePathname } from 'next/navigation';
import { AppShell } from './AppShell';

const NO_SHELL_PATHS = ['/login'];

export function ConditionalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const noShell = NO_SHELL_PATHS.some((p) => pathname.startsWith(p));
  if (noShell) return <>{children}</>;
  return <AppShell>{children}</AppShell>;
}

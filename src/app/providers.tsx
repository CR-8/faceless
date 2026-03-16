"use client";

// HeroUI v3 no longer requires a top-level provider wrapper.
// shadcn/ui also requires no provider.
// This file is kept for future provider additions (e.g. themes, toasts).

export function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

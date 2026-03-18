'use client';
export default function DashboardError({ error: _error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 p-8">
      <p className="text-destructive">Something went wrong loading the dashboard.</p>
      <button onClick={reset} className="underline">Try again</button>
    </div>
  );
}

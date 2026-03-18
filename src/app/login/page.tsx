import { Suspense } from 'react';
import { Zap } from 'lucide-react';
import { LoginForm } from './LoginForm';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)] px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--accent-lime)', boxShadow: 'var(--shadow-lime)' }}
          >
            <Zap size={16} className="text-[#0f0f11]" />
          </div>
          <span
            className="font-semibold text-lg tracking-tight text-[var(--text-primary)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Creator Studio
          </span>
        </div>
        <Suspense fallback={<div className="h-64 bg-[var(--bg-surface)] rounded-xl animate-pulse" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}

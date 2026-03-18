'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [magicSent, setMagicSent] = useState(false);

  const supabase = createSupabaseBrowserClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(next);
        router.refresh();
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMagicSent(true);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink() {
    if (!email) { setError('Enter your email first'); return; }
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}${next}` },
      });
      if (error) throw error;
      setMagicSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="bg-[var(--bg-surface)] border border-[var(--border-card)] rounded-xl p-6 shadow-[var(--shadow-md)]">
        <h1 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
          {mode === 'signin' ? 'Welcome back' : 'Create account'}
        </h1>
        <p className="text-sm text-[var(--text-muted)] mb-6">
          {mode === 'signin' ? 'Sign in to your account' : 'Get started for free'}
        </p>

        {magicSent ? (
          <div className="text-center py-4">
            <p className="text-sm text-[var(--text-secondary)]">
              Check your email — we sent you a link to sign in.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="text-xs text-[var(--text-secondary)]">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="bg-[var(--bg-raised)] border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password" className="text-xs text-[var(--text-secondary)]">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-[var(--bg-raised)] border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full font-semibold"
              style={{ background: 'var(--accent-lime)', color: '#0f0f11' }}
            >
              {loading
                ? <Loader2 size={16} className="animate-spin" />
                : mode === 'signin' ? 'Sign in' : 'Create account'}
            </Button>

            <div className="relative flex items-center gap-3">
              <div className="flex-1 h-px bg-[var(--border-subtle)]" />
              <span className="text-xs text-[var(--text-muted)]">or</span>
              <div className="flex-1 h-px bg-[var(--border-subtle)]" />
            </div>

            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={handleMagicLink}
              className="w-full border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-raised)]"
            >
              Send magic link
            </Button>
          </form>
        )}
      </div>

      <p className="text-center text-xs text-[var(--text-muted)] mt-4">
        {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
        <button
          onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}
          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline underline-offset-2"
        >
          {mode === 'signin' ? 'Sign up' : 'Sign in'}
        </button>
      </p>
    </>
  );
}

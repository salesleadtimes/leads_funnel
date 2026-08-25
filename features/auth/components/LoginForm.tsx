'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Mail, Lock, Sparkles, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type AuthMode = 'magic_link' | 'password';

export function LoginForm() {
  const supabase = createSupabaseBrowserClient();
  const [authMode, setAuthMode] = useState<AuthMode>('magic_link');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const err = params.get('error') || hashParams.get('error_description') || hashParams.get('error');
      const msg = params.get('message');
      if (err) setError(decodeURIComponent(err));
      if (msg) setMessage(decodeURIComponent(msg));
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (authMode === 'magic_link') {
        const redirectTo = `${window.location.origin}/auth/callback`;
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: { emailRedirectTo: redirectTo },
        });
        if (otpError) setError(otpError.message);
        else setMessage(`Magic link sent to ${email}! Check your inbox.`);
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) setError(signInError.message);
        else window.location.href = '/';
      }
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : null) || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #0D1B3E 0%, #0A152F 45%, #06355A 100%)',
      }}
    >
      {/* Background decorative circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #00AEEF, transparent)' }}
        />
        <div
          className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #0091D5, transparent)' }}
        />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Brand header */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-4 mb-3">
            <div className="relative w-14 h-14">
              <Image src="/Logo-2.png" alt="Times IT Solutions" fill className="object-contain" />
            </div>
            <div>
              <h1 className="text-white text-xl font-display font-bold leading-tight">
                Lead & Bid Manager
              </h1>
              <p className="text-white/50 text-xs font-mono">GeM · Government · Corporate</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-white/30 text-xs">
            <span className="h-px w-8 bg-white/20" />
            <span>Times IT Solutions</span>
            <span className="h-px w-8 bg-white/20" />
          </div>
        </div>

        <Card
          className="border-0 shadow-2xl"
          style={{
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <CardHeader className="pb-2 pt-6 px-6">
            {/* Auth Mode Toggle */}
            <div
              className="flex gap-1 rounded-lg p-1"
              style={{ background: 'rgba(0,0,0,0.25)' }}
            >
              <button
                type="button"
                onClick={() => { setAuthMode('magic_link'); setError(''); setMessage(''); }}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition-all ${
                  authMode === 'magic_link'
                    ? 'bg-white text-[#0091D5] shadow-sm'
                    : 'text-white/50 hover:text-white/70'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Magic Link
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('password'); setError(''); setMessage(''); }}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition-all ${
                  authMode === 'password'
                    ? 'bg-white text-[#0091D5] shadow-sm'
                    : 'text-white/50 hover:text-white/70'
                }`}
              >
                <KeyRound className="h-3.5 w-3.5" />
                Password
              </button>
            </div>
          </CardHeader>

          <CardContent className="px-6 pb-6 pt-4 space-y-4">
            {/* Alerts */}
            {error && (
              <div className="flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                {error}
              </div>
            )}
            {message && (
              <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-white/50">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@company.com"
                    autoComplete="email"
                    className="flex h-10 w-full rounded-lg border pl-10 pr-3 py-2 text-sm text-white placeholder-white/25 bg-white/6 border-white/12 focus:outline-none focus:ring-2 focus:ring-[#00AEEF]/50 focus:border-[#00AEEF]/50 transition-all"
                  />
                </div>
              </div>

              {authMode === 'password' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-widest text-white/50">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="flex h-10 w-full rounded-lg border pl-10 pr-3 py-2 text-sm text-white placeholder-white/25 bg-white/6 border-white/12 focus:outline-none focus:ring-2 focus:ring-[#00AEEF]/50 focus:border-[#00AEEF]/50 transition-all"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
                style={{
                  background: loading
                    ? 'rgba(0,145,213,0.6)'
                    : 'linear-gradient(135deg, #0091D5, #00AEEF)',
                  boxShadow: '0 4px 20px rgba(0,145,213,0.35)',
                }}
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                    {authMode === 'magic_link' ? 'Sending Link…' : 'Signing in…'}
                  </span>
                ) : (
                  <>
                    {authMode === 'magic_link' ? <><Sparkles className="h-4 w-4" />Send Magic Link</> : <><Lock className="h-4 w-4" />Sign In</>}
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-xs text-white/30 mt-2">
              Access is restricted to authorized team members.
              <br />
              Ask your team Owner to receive an invite.
            </p>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-white/20 text-[11px] mt-6 font-mono">
          © Times IT Solutions · Powered by Supabase
        </p>
      </div>
    </div>
  );
}

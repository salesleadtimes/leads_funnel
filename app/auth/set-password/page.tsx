'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function SetPasswordPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setEmail(user.email);
      }
    }
    loadUser();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.replace('/');
        }, 1500);
      }
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : null) || 'Failed to update password.');
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
      <div className="w-full max-w-md relative z-10">
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
            <h2 className="text-lg font-display font-semibold text-white">Create Your Password</h2>
            <p className="text-xs text-white/50">
              {email ? (
                <>
                  Setting password for <strong className="text-white">{email}</strong>
                </>
              ) : (
                'Set a secure password to access your account anytime'
              )}
            </p>
          </CardHeader>

          <CardContent className="px-6 pb-6 pt-4 space-y-4">
            {error && (
              <div className="flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                Password saved successfully! Redirecting to dashboard…
              </div>
            )}

            {!success && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-widest text-white/50">
                    New Password (min 6 characters)
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="••••••••"
                      className="flex h-10 w-full rounded-lg border pl-10 pr-3 py-2 text-sm text-white placeholder-white/25 bg-white/6 border-white/12 focus:outline-none focus:ring-2 focus:ring-[#00AEEF]/50 focus:border-[#00AEEF]/50 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-widest text-white/50">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="••••••••"
                      className="flex h-10 w-full rounded-lg border pl-10 pr-3 py-2 text-sm text-white placeholder-white/25 bg-white/6 border-white/12 focus:outline-none focus:ring-2 focus:ring-[#00AEEF]/50 focus:border-[#00AEEF]/50 transition-all"
                    />
                  </div>
                </div>

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
                      Saving Password…
                    </span>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Save Password & Enter App
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => router.replace('/')}
                  className="w-full text-center text-xs text-white/40 hover:text-white/70 transition-colors pt-2"
                >
                  Skip for now & go to dashboard →
                </button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

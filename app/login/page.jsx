'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '../../lib/supabase/client';

export default function LoginPage() {
  const supabase = createSupabaseBrowserClient();
  const [authMode, setAuthMode]   = useState('magic_link'); // 'magic_link' | 'password'
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [error, setError]         = useState('');
  const [message, setMessage]     = useState('');
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    // Read error or message from query string if redirected
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const err = params.get('error');
      const msg = params.get('message');
      if (err) setError(err);
      if (msg) setMessage(msg);
    }
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (authMode === 'magic_link') {
        const redirectTo = `${window.location.origin}/auth/callback`;
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            emailRedirectTo: redirectTo
          }
        });

        if (otpError) {
          setError(otpError.message);
        } else {
          setMessage(`✨ Magic link sent to ${email}! Check your inbox to sign in.`);
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });

        if (signInError) {
          setError(signInError.message);
        } else {
          window.location.href = '/';
        }
      }
    } catch (err) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <img src="/Logo-2.png" alt="App Logo" width="48" height="48" style={{ objectFit: 'contain' }} />
          <div>
            <h1>Lead & Bid Manager</h1>
            <span>GeM · Government · Corporate</span>
          </div>
        </div>

        {/* Tab switcher for authentication mode */}
        <div style={{
          display: 'flex',
          borderRadius: '8px',
          background: 'var(--bg-subtle, #f3f4f6)',
          padding: '4px',
          marginBottom: '20px',
          gap: '4px'
        }}>
          <button
            type="button"
            style={{
              flex: 1,
              padding: '8px 12px',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              background: authMode === 'magic_link' ? '#ffffff' : 'transparent',
              color: authMode === 'magic_link' ? 'var(--primary-color, #2563eb)' : '#6b7280',
              boxShadow: authMode === 'magic_link' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s ease'
            }}
            onClick={() => {
              setAuthMode('magic_link');
              setError('');
              setMessage('');
            }}
          >
            ✨ Magic Link
          </button>
          <button
            type="button"
            style={{
              flex: 1,
              padding: '8px 12px',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              background: authMode === 'password' ? '#ffffff' : 'transparent',
              color: authMode === 'password' ? 'var(--primary-color, #2563eb)' : '#6b7280',
              boxShadow: authMode === 'password' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s ease'
            }}
            onClick={() => {
              setAuthMode('password');
              setError('');
              setMessage('');
            }}
          >
            🔑 Password
          </button>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && (
            <div className="login-error" style={{
              background: '#fef2f2',
              color: '#991b1b',
              border: '1px solid #fecaca',
              padding: '10px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              marginBottom: '16px'
            }}>
              ⚠️ {error}
            </div>
          )}

          {message && (
            <div style={{
              background: '#f0fdf4',
              color: '#166534',
              border: '1px solid #bbf7d0',
              padding: '10px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              marginBottom: '16px'
            }}>
              {message}
            </div>
          )}

          <label>
            Email address
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@company.com"
              autoComplete="email"
            />
          </label>

          {authMode === 'password' && (
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </label>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '8px' }}>
            {loading
              ? (authMode === 'magic_link' ? 'Sending Link…' : 'Signing in…')
              : (authMode === 'magic_link' ? 'Send Magic Link' : 'Sign In')}
          </button>
        </form>

        <p className="login-footer" style={{ marginTop: '20px', fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
          Access is restricted to authorized team members.<br/>
          Receive an invite or ask your team Owner to get access.
        </p>
      </div>
    </div>
  );
}

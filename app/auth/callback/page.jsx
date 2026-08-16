'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '../../../lib/supabase/client';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [viewState, setViewState] = useState('verifying'); // 'verifying' | 'set_password' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('');
  const [statusMsg, setStatusMsg] = useState('Verifying your invitation & completing sign in…');

  const [userEmail, setUserEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passError, setPassError] = useState('');
  const [savingPass, setSavingPass] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const handleAuthCallback = async () => {
      try {
        const supabase = createSupabaseBrowserClient();

        // 1. Check for error in query searchParams or URL hash fragment
        const queryError = searchParams.get('error_description') || searchParams.get('error');
        const hash = typeof window !== 'undefined' ? window.location.hash.substring(1) : '';
        const hashParams = new URLSearchParams(hash);
        const hashError = hashParams.get('error_description') || hashParams.get('error');

        if (queryError || hashError) {
          const err = decodeURIComponent(queryError || hashError);
          console.error('[Auth Callback] Auth error from URL:', err);
          if (isMounted) {
            setErrorMsg(err);
            setViewState('error');
          }
          setTimeout(() => {
            router.replace(`/login?error=${encodeURIComponent(err)}`);
          }, 3000);
          return;
        }

        const typeParam = searchParams.get('type') || hashParams.get('type');

        // Helper function to process session & check if password setup is needed
        const finalizeSession = async (sessionUser) => {
          let email = sessionUser?.email;
          if (!email) {
            const { data: { user } } = await supabase.auth.getUser();
            email = user?.email || '';
          }
          if (isMounted && email) setUserEmail(email);

          // Check if this callback comes from an invitation or password recovery
          const isInviteOrRecovery =
            typeParam === 'invite' ||
            typeParam === 'recovery' ||
            hash.includes('type=invite') ||
            hash.includes('type=recovery');

          if (isInviteOrRecovery) {
            if (isMounted) setViewState('set_password');
          } else {
            // Regular magic link sign-in -> redirect to home
            router.replace('/');
          }
        };

        // 2. Check for PKCE ?code= in searchParams
        const code = searchParams.get('code');
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error('[Auth Callback] Code exchange error:', error);
            if (isMounted) {
              setErrorMsg(error.message);
              setViewState('error');
            }
            setTimeout(() => {
              router.replace(`/login?error=${encodeURIComponent(error.message)}`);
            }, 3000);
            return;
          }
          await finalizeSession(data?.session?.user);
          return;
        }

        // 3. Check for ?token_hash= & ?type= in searchParams
        const token_hash = searchParams.get('token_hash');
        const type = searchParams.get('type');
        if (token_hash && type) {
          const { data, error } = await supabase.auth.verifyOtp({ type, token_hash });
          if (error) {
            console.error('[Auth Callback] Token Hash OTP error:', error);
            if (isMounted) {
              setErrorMsg(error.message);
              setViewState('error');
            }
            setTimeout(() => {
              router.replace(`/login?error=${encodeURIComponent(error.message)}`);
            }, 3000);
            return;
          }
          await finalizeSession(data?.user);
          return;
        }

        // 4. Check for implicit hash fragment (#access_token=... or #type=invite)
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          if (error) {
            console.error('[Auth Callback] Implicit session set error:', error);
            if (isMounted) {
              setErrorMsg(error.message);
              setViewState('error');
            }
            setTimeout(() => {
              router.replace(`/login?error=${encodeURIComponent(error.message)}`);
            }, 3000);
            return;
          }
          await finalizeSession(data?.session?.user);
          return;
        }

        // 5. Fallback: Allow browser client to detect session automatically
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await finalizeSession(session.user);
          return;
        }

        // If no auth tokens found at all
        if (isMounted) {
          setErrorMsg('Invalid or expired authentication link.');
          setViewState('error');
        }
        setTimeout(() => {
          router.replace('/login?error=Invalid%20or%20expired%20auth%20link');
        }, 3000);

      } catch (err) {
        console.error('[Auth Callback] Unexpected error:', err);
        if (isMounted) {
          setErrorMsg(err.message || 'An unexpected error occurred during sign in.');
          setViewState('error');
        }
        setTimeout(() => {
          router.replace('/login?error=Authentication%20failed');
        }, 3000);
      }
    };

    handleAuthCallback();

    return () => {
      isMounted = false;
    };
  }, [router, searchParams]);

  const handleSavePassword = async (e) => {
    e.preventDefault();
    setPassError('');

    if (!password || password.length < 6) {
      setPassError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setPassError('Passwords do not match.');
      return;
    }

    setSavingPass(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setPassError(error.message);
      } else {
        setViewState('success');
        setTimeout(() => {
          router.replace('/');
        }, 1500);
      }
    } catch (err) {
      setPassError(err.message || 'Failed to update password.');
    } finally {
      setSavingPass(false);
    }
  };

  const handleSkip = () => {
    router.replace('/');
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      backgroundColor: '#14181F',
      color: '#ffffff',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#1d2330',
        padding: '36px 32px',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
        textAlign: 'left',
        maxWidth: '440px',
        width: '100%'
      }}>
        {viewState === 'verifying' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '36px',
              height: '36px',
              border: '3px solid rgba(255, 255, 255, 0.2)',
              borderTopColor: '#0091D5',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px auto'
            }} />
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: '#ffffff' }}>
              Completing Authentication
            </h2>
            <p style={{ fontSize: '14px', color: '#9aa5b4', lineHeight: '1.5' }}>{statusMsg}</p>
          </div>
        )}

        {viewState === 'set_password' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <img src="/Logo-2.png" alt="App Logo" width="36" height="36" style={{ objectFit: 'contain' }} />
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff', margin: 0 }}>
                  Create Your Password
                </h2>
                <span style={{ fontSize: '12px', color: '#00AEEF' }}>Welcome to Lead & Bid Manager</span>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: '#aeb8c4', marginBottom: '20px', lineHeight: '1.5' }}>
              Account confirmed for <strong style={{ color: '#ffffff' }}>{userEmail}</strong>. Set a password below so you can log in easily anytime using your password.
            </p>

            {passError && (
              <div style={{
                background: 'rgba(192, 57, 43, 0.2)',
                border: '1px solid rgba(192, 57, 43, 0.4)',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '13px',
                color: '#e74c3c',
                marginBottom: '16px'
              }}>
                ⚠️ {passError}
              </div>
            )}

            <form onSubmit={handleSavePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#9aa5b4', marginBottom: '6px' }}>
                  New Password (min 6 characters)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#ffffff',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#9aa5b4', marginBottom: '6px' }}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#ffffff',
                    fontSize: '14px'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={savingPass}
                style={{
                  marginTop: '6px',
                  padding: '11px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#0091D5',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease'
                }}
              >
                {savingPass ? 'Saving Password…' : 'Save Password & Enter App →'}
              </button>

              <button
                type="button"
                onClick={handleSkip}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#7888a0',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  marginTop: '4px'
                }}
              >
                Skip for now & continue to dashboard
              </button>
            </form>
          </div>
        )}

        {viewState === 'success' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '42px', marginBottom: '12px' }}>🎉</div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1E8A5F', marginBottom: '8px' }}>
              Password Set Successfully!
            </h2>
            <p style={{ fontSize: '14px', color: '#aeb8c4' }}>
              Redirecting you to the dashboard…
            </p>
          </div>
        )}

        {viewState === 'error' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚠️</div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#e74c3c', marginBottom: '8px' }}>
              Invitation Link Invalid or Expired
            </h2>
            <p style={{ fontSize: '14px', color: '#9aa5b4', marginBottom: '16px', lineHeight: '1.5' }}>
              {errorMsg}
            </p>
            <p style={{ fontSize: '12px', color: '#7888a0' }}>Redirecting to login page…</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: 'system-ui, sans-serif',
        backgroundColor: '#14181F',
        color: '#ffffff'
      }}>
        Loading authentication…
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}

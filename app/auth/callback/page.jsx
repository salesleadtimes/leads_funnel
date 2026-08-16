'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '../../../lib/supabase/client';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMsg, setErrorMsg] = useState('');
  const [statusMsg, setStatusMsg] = useState('Verifying your invitation & completing sign in…');

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
            setStatusMsg('');
          }
          setTimeout(() => {
            router.replace(`/login?error=${encodeURIComponent(err)}`);
          }, 2500);
          return;
        }

        // 2. Check for PKCE ?code= in searchParams
        const code = searchParams.get('code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error('[Auth Callback] Code exchange error:', error);
            if (isMounted) setErrorMsg(error.message);
            setTimeout(() => {
              router.replace(`/login?error=${encodeURIComponent(error.message)}`);
            }, 2500);
            return;
          }
          router.replace('/');
          return;
        }

        // 3. Check for ?token_hash= & ?type= in searchParams
        const token_hash = searchParams.get('token_hash');
        const type = searchParams.get('type');
        if (token_hash && type) {
          const { error } = await supabase.auth.verifyOtp({ type, token_hash });
          if (error) {
            console.error('[Auth Callback] Token Hash OTP error:', error);
            if (isMounted) setErrorMsg(error.message);
            setTimeout(() => {
              router.replace(`/login?error=${encodeURIComponent(error.message)}`);
            }, 2500);
            return;
          }
          router.replace('/');
          return;
        }

        // 4. Check for implicit hash fragment (#access_token=... or #type=invite)
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          if (error) {
            console.error('[Auth Callback] Implicit session set error:', error);
            if (isMounted) setErrorMsg(error.message);
            setTimeout(() => {
              router.replace(`/login?error=${encodeURIComponent(error.message)}`);
            }, 2500);
            return;
          }
          router.replace('/');
          return;
        }

        // 5. Fallback: Allow browser client to detect session automatically
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          router.replace('/');
          return;
        }

        // If no auth tokens found at all
        if (isMounted) setErrorMsg('Invalid or expired authentication link.');
        setTimeout(() => {
          router.replace('/login?error=Invalid%20or%20expired%20auth%20link');
        }, 2500);

      } catch (err) {
        console.error('[Auth Callback] Unexpected error:', err);
        if (isMounted) setErrorMsg(err.message || 'An unexpected error occurred during sign in.');
        setTimeout(() => {
          router.replace('/login?error=Authentication%20failed');
        }, 2500);
      }
    };

    handleAuthCallback();

    return () => {
      isMounted = false;
    };
  }, [router, searchParams]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundColor: '#f9fafb',
      color: '#111827',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        padding: '32px',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        textAlign: 'center',
        maxWidth: '420px',
        width: '100%'
      }}>
        {errorMsg ? (
          <>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚠️</div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#dc2626', marginBottom: '8px' }}>
              Invitation Link Invalid
            </h2>
            <p style={{ fontSize: '14px', color: '#4b5563', marginBottom: '16px', lineHeight: '1.5' }}>
              {errorMsg}
            </p>
            <p style={{ fontSize: '12px', color: '#9ca3af' }}>Redirecting to login page…</p>
          </>
        ) : (
          <>
            <div style={{
              width: '36px',
              height: '36px',
              border: '3px solid #e5e7eb',
              borderTopColor: '#2563eb',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px auto'
            }} />
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
              Completing Authentication
            </h2>
            <p style={{ fontSize: '14px', color: '#4b5563', lineHeight: '1.5' }}>{statusMsg}</p>
          </>
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
        fontFamily: 'system-ui, sans-serif'
      }}>
        Loading authentication…
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../lib/supabase/server';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = searchParams.get('next') || '/';

  // 1. Check for errors returned in query params
  const error_description = searchParams.get('error_description') || searchParams.get('error');
  if (error_description) {
    console.error('[Auth Callback] Error in query params:', error_description);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error_description)}`);
  }

  // 2. PKCE code exchange on the server
  if (code) {
    try {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error('[Auth Callback] exchangeCodeForSession error:', error.message);
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
      }

      if (type === 'invite' || type === 'recovery') {
        return NextResponse.redirect(`${origin}/auth/set-password?type=${type}`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    } catch (err) {
      console.error('[Auth Callback] Unexpected server error during code exchange:', err);
      return NextResponse.redirect(`${origin}/login?error=Authentication%20failed`);
    }
  }

  // 3. Token hash OTP verification (for invite or recovery links)
  if (token_hash && type) {
    try {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase.auth.verifyOtp({
        type,
        token_hash,
      });

      if (error) {
        console.error('[Auth Callback] verifyOtp error:', error.message);
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
      }

      if (type === 'invite' || type === 'recovery') {
        return NextResponse.redirect(`${origin}/auth/set-password?type=${type}`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    } catch (err) {
      console.error('[Auth Callback] Unexpected server error during verifyOtp:', err);
      return NextResponse.redirect(`${origin}/login?error=Authentication%20failed`);
    }
  }

  // 4. If no code or token_hash was provided
  return NextResponse.redirect(`${origin}/login?error=Invalid%20or%20expired%20auth%20link`);
}

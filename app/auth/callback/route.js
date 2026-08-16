import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../lib/supabase/server';

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  const next = requestUrl.searchParams.get('next') || '/';
  const error_desc = requestUrl.searchParams.get('error_description') || requestUrl.searchParams.get('error');

  if (error_desc) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error_desc)}`, requestUrl.origin));
  }

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
    console.error('[Auth Callback] Code exchange error:', error);
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, requestUrl.origin));
  }

  if (token_hash && type) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (!error) {
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
    console.error('[Auth Callback] OTP verification error:', error);
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, requestUrl.origin));
  }

  // Redirect to login page if code/token exchange fails or no parameter is present
  return NextResponse.redirect(new URL('/login?error=Invalid%20or%20expired%20auth%20link', requestUrl.origin));
}

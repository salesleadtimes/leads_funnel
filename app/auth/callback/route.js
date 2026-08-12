import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../lib/supabase/server';

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/';

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
    console.error('[Auth Callback] Code exchange error:', error);
  }

  // Redirect to login page if code exchange fails or no code is present
  return NextResponse.redirect(new URL('/login?error=Invalid%20or%20expired%20auth%20link', requestUrl.origin));
}

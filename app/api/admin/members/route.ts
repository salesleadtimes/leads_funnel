import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../lib/supabase/server';
import { getMembersList } from '../../../../lib/services/memberService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function GET() {
  try {
    const supabaseServer = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabaseServer.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    const { data: profile } = await supabaseServer
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'owner') {
      return NextResponse.json(
        { error: 'Permission denied. Owner access required.' },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

    const members = await getMembersList();
    return NextResponse.json(members, { headers: NO_CACHE_HEADERS });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to fetch members list', detail: String(err) },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

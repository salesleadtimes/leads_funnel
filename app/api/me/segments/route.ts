import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

/**
 * GET /api/me/segments
 *
 * Returns the segments accessible to the currently authenticated user.
 * - Owners  → all active segments
 * - Members → only their assigned segments (via user_segments junction)
 *
 * RLS on the `segments` table already enforces this; we just call it
 * through the server client so the correct session is used.
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    // Check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    let segments: { id: string; name: string; code?: string }[] = [];

    if (profile?.role === 'owner') {
      // Owner sees all active segments
      const { data, error } = await supabase
        .from('segments')
        .select('id, code, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      segments = data || [];
    } else {
      // Member sees only assigned segments
      const { data, error } = await supabase
        .from('user_segments')
        .select('segment_id, segments(id, code, name)')
        .eq('user_id', user.id);
      if (error) throw error;
      segments = ((data || []) as any[])
        .map((r) => r.segments)
        .filter(Boolean);
    }

    return NextResponse.json(segments, { headers: NO_CACHE_HEADERS });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to fetch segments', detail: String(err) },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

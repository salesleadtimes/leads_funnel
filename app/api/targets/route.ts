import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import {
  getAllMemberTargets,
  upsertMemberTarget,
  derivePeriodTargets,
} from '../../../lib/services/targetsService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

/**
 * GET /api/targets
 * Returns member_targets rows enriched with derived period amounts.
 * Query params: segment_id, user_id (or 'all'), year
 */
export async function GET(request: NextRequest) {
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

    const isOwner = profile?.role === 'owner';
    const { searchParams } = new URL(request.url);

    const segmentId =
      searchParams.get('segment_id') || searchParams.get('segmentId') || null;
    const yearParam = searchParams.get('year');
    const year = yearParam ? parseInt(yearParam, 10) : null;

    // For non-owner, enforce user_id = authenticated user ID
    let userId: string | null | undefined =
      searchParams.get('user_id') || searchParams.get('userId');
    if (!isOwner) {
      userId = user.id;
    } else if (userId === 'all') {
      userId = undefined;
    }

    const targets = await getAllMemberTargets({
      segmentId,
      userId: userId === undefined ? undefined : userId || null,
      year,
    });

    // Enrich each target with derived period amounts for easy frontend use
    const enriched = targets.map((t: any) => {
      const derived = derivePeriodTargets(Number(t.daily_target_amount) || 0);
      return {
        ...t,
        derivedTargets: {
          daily: derived.daily,
          weekly: derived.weekly,
          monthly: derived.monthly,
          quarterly: derived.quarterly,
          annual: derived.annual,
        },
      };
    });

    return NextResponse.json(enriched, { headers: NO_CACHE_HEADERS });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to fetch targets', detail: String(err) },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

/**
 * PUT /api/targets
 * Accepts:
 *   { segment_id, user_id?, year, daily_target_amount }
 * or array of the above.
 * Upserts into member_targets table.
 */
export async function PUT(request: NextRequest) {
  try {
    const supabaseServer = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabaseServer.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabaseServer
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'owner') {
      return NextResponse.json(
        { error: 'Permission denied. Only owners can set sales targets.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    if (!body) {
      return NextResponse.json(
        { error: 'Invalid targets payload' },
        { status: 400 }
      );
    }

    const items: any[] = Array.isArray(body) ? body : Array.isArray(body.targets) ? body.targets : [body];

    const results = [];
    for (const item of items) {
      const segmentId = item.segment_id || item.segmentId;
      const userId = item.user_id || item.userId || null;
      const year = Number(item.year) || new Date().getFullYear();
      const dailyTargetAmount = Number(item.daily_target_amount ?? item.dailyTargetAmount) || 0;

      if (!segmentId) {
        return NextResponse.json({ error: 'segment_id is required' }, { status: 400 });
      }

      const result = await upsertMemberTarget({ segmentId, userId, year, dailyTargetAmount });
      const derived = derivePeriodTargets(Number(result.daily_target_amount) || 0);
      results.push({ ...result, derivedTargets: derived });
    }

    return NextResponse.json(results.length === 1 ? results[0] : results);
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to update targets', detail: String(err) },
      { status: 500 }
    );
  }
}

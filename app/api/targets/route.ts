import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import {
  getTargets,
  bulkUpsertTargets,
  upsertTarget,
} from '../../../lib/services/targetsService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

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
    const periodType =
      searchParams.get('period_type') || searchParams.get('periodType') || null;
    const periodValueParam =
      searchParams.get('period_value') || searchParams.get('periodValue');
    const periodValue =
      periodValueParam !== null && periodValueParam !== undefined
        ? parseInt(periodValueParam, 10)
        : undefined;

    // For non-owner, enforce user_id = authenticated user ID
    let userId: string | null | undefined =
      searchParams.get('user_id') || searchParams.get('userId');
    if (!isOwner) {
      userId = user.id;
    } else if (userId === 'all') {
      userId = undefined;
    }

    const targets = await getTargets({
      segmentId,
      userId: userId === undefined ? undefined : userId || null,
      year,
      periodType,
      periodValue,
    });

    return NextResponse.json(targets, { headers: NO_CACHE_HEADERS });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to fetch targets', detail: String(err) },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

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

    let updated;
    if (Array.isArray(body)) {
      updated = await bulkUpsertTargets(body);
    } else if (Array.isArray(body.targets)) {
      updated = await bulkUpsertTargets(body.targets);
    } else {
      updated = await upsertTarget(body);
    }

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to update targets', detail: String(err) },
      { status: 500 }
    );
  }
}

import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '../../../../../../lib/supabase/server';
import { updateMemberSegments } from '../../../../../../lib/services/memberService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return handleUpdateSegments(request, params);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return handleUpdateSegments(request, params);
}

async function handleUpdateSegments(
  request: NextRequest,
  params: { id: string }
) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

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
        { error: 'Permission denied. Only owners can assign segments.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const segmentIds = body.segmentIds || body.segment_ids || [];

    const result = await updateMemberSegments(id, segmentIds);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to update member segments', detail: String(err) },
      { status: 500 }
    );
  }
}

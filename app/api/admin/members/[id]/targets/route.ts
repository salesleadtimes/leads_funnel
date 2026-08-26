import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '../../../../../../lib/supabase/server';
import { saveMemberTargets } from '../../../../../../lib/services/memberService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return handleSaveTargets(request, params);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return handleSaveTargets(request, params);
}

async function handleSaveTargets(
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
        { error: 'Permission denied. Only owners can configure member targets.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const targets = Array.isArray(body) ? body : body.targets || [];

    const updated = await saveMemberTargets(id, targets);
    return NextResponse.json({ success: true, updated });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to save member targets', detail: String(err) },
      { status: 500 }
    );
  }
}

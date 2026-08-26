import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '../../../../../lib/supabase/server';
import {
  getMemberDetails,
  updateMemberProfile,
} from '../../../../../lib/services/memberService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    if (profile?.role !== 'owner' && user.id !== id) {
      return NextResponse.json(
        { error: 'Permission denied. Owner access required.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();
    const refDate =
      searchParams.get('ref_date') || searchParams.get('refDate') || null;

    const details = await getMemberDetails(id, year, refDate);
    return NextResponse.json(details);
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to fetch member details', detail: String(err) },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
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
        { error: 'Permission denied. Only owners can edit team members.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const updated = await updateMemberProfile(id, body);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to update member', detail: String(err) },
      { status: 500 }
    );
  }
}

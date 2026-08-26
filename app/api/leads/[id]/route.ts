import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '../../../../lib/supabase/server';
import {
  getLeadById,
  updateLead,
  deleteLead,
  hardDeleteLead,
} from '../../../../lib/services/leadsService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Lead ID required' }, { status: 400 });
    }

    const lead = await getLeadById(id);
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }
    return NextResponse.json(lead);
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to fetch lead', detail: String(err) },
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
      return NextResponse.json({ error: 'Lead ID required' }, { status: 400 });
    }

    // 1. Authenticate user
    const supabaseServer = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabaseServer.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch existing lead to check authorization
    const { data: lead, error: fetchErr } = await supabaseServer
      .from('leads')
      .select('id, segment_id, created_by, deleted_at')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // 3. Verify role
    const { data: profile } = await supabaseServer
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isOwner = profile?.role === 'owner';

    // 4. If member, verify lead was created by this member
    if (!isOwner) {
      if (lead.created_by !== user.id) {
        return NextResponse.json(
          {
            error:
              'Permission denied. Members can only edit leads created by themselves.',
          },
          { status: 403 }
        );
      }

      // Also verify segment access
      const { data: userSeg } = await supabaseServer
        .from('user_segments')
        .select('segment_id')
        .eq('user_id', user.id)
        .eq('segment_id', lead.segment_id)
        .maybeSingle();

      if (!userSeg) {
        return NextResponse.json(
          { error: 'Permission denied. You do not have access to this segment.' },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const updated = await updateLead(id, body);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to update lead', detail: String(err) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Lead ID required' }, { status: 400 });
    }

    // 1. Authenticate user
    const supabaseServer = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabaseServer.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch existing lead
    const { data: lead, error: fetchErr } = await supabaseServer
      .from('leads')
      .select('id, segment_id, created_by')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // 3. Verify role
    const { data: profile } = await supabaseServer
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isOwner = profile?.role === 'owner';

    if (!isOwner) {
      if (lead.created_by !== user.id) {
        return NextResponse.json(
          {
            error:
              'Permission denied. Members can only delete leads created by themselves.',
          },
          { status: 403 }
        );
      }
      await deleteLead(id); // soft delete
    } else {
      const url = new URL(request.url);
      const isHard = url.searchParams.get('hard') === 'true';
      if (isHard) {
        await hardDeleteLead(id);
      } else {
        await deleteLead(id);
      }
    }

    return NextResponse.json({ success: true, id });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to delete lead', detail: String(err) },
      { status: 500 }
    );
  }
}

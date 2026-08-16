import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../lib/supabase/server';
import { createSupabaseAdminClient } from '../../../../lib/supabase/admin';

export async function POST(request) {
  try {
    // 1. Authenticate caller session
    const supabaseServer = await createSupabaseServerClient();
    const { data: { user: callerUser }, error: authError } = await supabaseServer.auth.getUser();

    if (authError || !callerUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify owner role authorization
    const { data: callerProfile, error: profileError } = await supabaseServer
      .from('profiles')
      .select('role')
      .eq('id', callerUser.id)
      .single();

    if (profileError || callerProfile?.role !== 'owner') {
      return NextResponse.json(
        { error: 'Permission denied. Only users with the owner role can invite new members.' },
        { status: 403 }
      );
    }

    // 3. Parse and validate request body
    const body = await request.json();
    const { email, full_name, role = 'member', segmentIds } = body || {};

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email address is required.' }, { status: 400 });
    }

    if (!full_name || typeof full_name !== 'string' || !full_name.trim()) {
      return NextResponse.json({ error: 'Full name is required.' }, { status: 400 });
    }

    if (!Array.isArray(segmentIds) || segmentIds.length === 0) {
      return NextResponse.json({ error: 'At least one segment must be assigned.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = full_name.trim();

    // 4. Check if user already exists in profiles
    const { data: existingProfile } = await supabaseServer
      .from('profiles')
      .select('id, email')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (existingProfile) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    // 5. Initialize Supabase Admin client
    if (!process.env.SUPABASE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Missing SUPABASE_SECRET_KEY in .env.local. Please add your Supabase Service Role Key to .env.local to enable sending user invitations.' },
        { status: 400 }
      );
    }

    let supabaseAdmin;
    try {
      supabaseAdmin = createSupabaseAdminClient();
    } catch (err) {
      console.error('[Invite API] Admin Client init error:', err);
      return NextResponse.json(
        { error: 'Server configuration error: Unable to initialize Supabase Admin client.' },
        { status: 500 }
      );
    }

    // 6. Trigger Supabase Auth invitation email
    const requestOrigin = request.nextUrl.origin || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const redirectTo = `${requestOrigin}/auth/callback?type=invite`;

    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      cleanEmail,
      {
        data: {
          full_name: cleanName,
          role: role === 'owner' ? 'owner' : 'member'
        },
        redirectTo
      }
    );

    if (inviteError) {
      console.error('[Invite API] Supabase invite error:', inviteError);
      const isAlreadyExists = inviteError.message?.toLowerCase().includes('already registered') ||
                             inviteError.message?.toLowerCase().includes('already exists');
      return NextResponse.json(
        { error: isAlreadyExists ? 'User already exists' : inviteError.message },
        { status: 400 }
      );
    }

    const invitedUser = inviteData?.user;
    if (!invitedUser) {
      return NextResponse.json({ error: 'Failed to create invitation.' }, { status: 500 });
    }

    // 7. Ensure profile record exists with correct metadata
    await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: invitedUser.id,
          email: cleanEmail,
          full_name: cleanName,
          role: role === 'owner' ? 'owner' : 'member',
          is_active: true
        },
        { onConflict: 'id' }
      );

    // 8. Insert segment assignments into user_segments junction
    const userSegmentRecords = segmentIds.map(segId => ({
      user_id: invitedUser.id,
      segment_id: segId
    }));

    const { error: segError } = await supabaseAdmin
      .from('user_segments')
      .upsert(userSegmentRecords, { onConflict: 'user_id,segment_id' });

    if (segError) {
      console.error('[Invite API] User segments insertion error:', segError);
    }

    return NextResponse.json({
      success: true,
      message: `Invitation sent to ${cleanEmail}`,
      user: {
        id: invitedUser.id,
        email: cleanEmail,
        full_name: cleanName,
        role: role
      }
    });

  } catch (err) {
    console.error('[Invite API] Internal server error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while processing the invitation.', detail: String(err) },
      { status: 500 }
    );
  }
}

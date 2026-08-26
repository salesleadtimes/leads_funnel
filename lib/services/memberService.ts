import { createSupabaseBrowserClient } from '../supabase/client';
import { getTargets, bulkUpsertTargets, getTargetAchievement } from './targetsService';
import { PeriodType } from '../utils/periodUtils';

const supabase = createSupabaseBrowserClient();

export interface MemberListItem {
  id: string;
  email: string;
  fullName: string;
  role: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
  assignedSegments: Array<{ id: string; code?: string; name: string; is_active?: boolean }>;
  targetCount: number;
  currentMonthlyTarget: number;
}

export interface MemberDetailsResult {
  profile: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    phone: string;
    isActive: boolean;
    createdAt: string;
  };
  assignedSegments: any[];
  allSegments: any[];
  targets: any[];
  achievements: Record<string, Record<string, any>>;
}

/**
 * Fetch all team members with assigned segments and target overview.
 */
export async function getMembersList(): Promise<MemberListItem[]> {
  const [
    { data: profiles, error: profErr },
    { data: userSegs, error: segErr },
    { data: targets, error: targetErr }
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, email, full_name, role, phone, is_active, created_at')
      .order('full_name', { ascending: true }),
    supabase
      .from('user_segments')
      .select('user_id, segment_id, segments(id, code, name, is_active)'),
    supabase
      .from('targets')
      .select('id, segment_id, user_id, year, period_type, period_value, target_value')
      .not('user_id', 'is', null)
  ]);

  if (profErr) throw profErr;
  if (segErr) console.warn('[memberService] user_segments fetch error:', segErr);
  if (targetErr) console.warn('[memberService] targets fetch error:', targetErr);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // Group segments by user_id
  const segmentsByUser: Record<string, any[]> = {};
  ((userSegs || []) as any[]).forEach((us) => {
    if (!segmentsByUser[us.user_id]) segmentsByUser[us.user_id] = [];
    if (us.segments) segmentsByUser[us.user_id].push(us.segments);
  });

  // Group targets by user_id
  const targetsByUser: Record<string, any[]> = {};
  ((targets || []) as any[]).forEach((t) => {
    if (!targetsByUser[t.user_id]) targetsByUser[t.user_id] = [];
    targetsByUser[t.user_id].push(t);
  });

  return ((profiles || []) as any[]).map((prof) => {
    const userTargets = targetsByUser[prof.id] || [];
    const assigned = segmentsByUser[prof.id] || [];

    // Compute active monthly target sum across assigned segments for current month
    const monthlyTargetTotal = userTargets
      .filter(
        (t) =>
          t.year === currentYear &&
          (t.period_type === 'month' || t.period_type === 'monthly') &&
          (t.period_value === currentMonth || t.period_value === null)
      )
      .reduce((sum, t) => sum + (Number(t.target_value) || 0), 0);

    return {
      id: prof.id,
      email: prof.email,
      fullName: prof.full_name || prof.email.split('@')[0],
      role: prof.role || 'member',
      phone: prof.phone || '',
      isActive: prof.is_active !== false,
      createdAt: prof.created_at,
      assignedSegments: assigned,
      targetCount: userTargets.length,
      currentMonthlyTarget: monthlyTargetTotal,
    };
  });
}

/**
 * Fetch complete detail for an individual member.
 */
export async function getMemberDetails(
  userId: string,
  year: number = new Date().getFullYear(),
  refDate: string | Date | null = null
): Promise<MemberDetailsResult> {
  const [
    { data: profile, error: profErr },
    { data: userSegs, error: segErr },
    { data: allSegs, error: allSegErr },
    userTargets
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, email, full_name, role, phone, is_active, created_at')
      .eq('id', userId)
      .single(),
    supabase
      .from('user_segments')
      .select('segment_id, segments(id, code, name, description, is_active)')
      .eq('user_id', userId),
    supabase
      .from('segments')
      .select('id, code, name, description, is_active')
      .eq('is_active', true)
      .order('name'),
    getTargets({ userId, year: Number(year) || new Date().getFullYear() })
  ]);

  if (profErr) throw profErr;
  if (segErr) console.warn('[memberService] userSegs error:', segErr);
  if (allSegErr) console.warn('[memberService] allSegs error:', allSegErr);

  const assignedSegments = ((userSegs || []) as any[]).map((r) => r.segments).filter(Boolean);

  // Fetch achievements for all assigned segments across 5 periods for live feedback
  const periodTypes: PeriodType[] = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];
  const achievements: Record<string, Record<string, any>> = {};

  for (const seg of assignedSegments) {
    achievements[seg.id] = {};
    for (const p of periodTypes) {
      try {
        const ach = await getTargetAchievement({
          userId,
          segmentId: seg.id,
          periodType: p,
          refDate,
        });
        achievements[seg.id][p] = ach;
      } catch (err) {
        console.warn(`[memberService] Achievement fetch error for ${seg.name} ${p}:`, err);
      }
    }
  }

  return {
    profile: {
      id: profile.id,
      email: profile.email,
      fullName: profile.full_name || '',
      role: profile.role || 'member',
      phone: profile.phone || '',
      isActive: profile.is_active !== false,
      createdAt: profile.created_at,
    },
    assignedSegments,
    allSegments: (allSegs || []) as any[],
    targets: (userTargets || []) as any[],
    achievements,
  };
}

export interface UpdateProfileParams {
  fullName?: string;
  phone?: string;
  role?: string;
  isActive?: boolean;
}

/**
 * Update member profile information.
 */
export async function updateMemberProfile(
  userId: string,
  { fullName, phone, role, isActive }: UpdateProfileParams
): Promise<any> {
  const patch: Record<string, any> = {};
  if (fullName !== undefined) patch.full_name = fullName.trim();
  if (phone !== undefined) patch.phone = phone.trim();
  if (role !== undefined) patch.role = role;
  if (isActive !== undefined) patch.is_active = Boolean(isActive);

  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update member assigned segments (add / remove).
 * Historical targets remain completely preserved.
 */
export async function updateMemberSegments(
  userId: string,
  segmentIds: string[] = []
): Promise<{ added: string[]; removed: string[] }> {
  if (!userId) throw new Error('User ID is required');

  // 1. Fetch current assigned segments
  const { data: current, error: getErr } = await supabase
    .from('user_segments')
    .select('segment_id')
    .eq('user_id', userId);

  if (getErr) throw getErr;

  const currentIds = ((current || []) as any[]).map((r) => r.segment_id);
  const toAdd = segmentIds.filter((id) => !currentIds.includes(id));
  const toRemove = currentIds.filter((id) => !segmentIds.includes(id));

  // 2. Remove segments no longer assigned
  if (toRemove.length > 0) {
    const { error: delErr } = await supabase
      .from('user_segments')
      .delete()
      .eq('user_id', userId)
      .in('segment_id', toRemove);
    if (delErr) throw delErr;
  }

  // 3. Insert newly assigned segments
  if (toAdd.length > 0) {
    const insertRows = toAdd.map((segId) => ({
      user_id: userId,
      segment_id: segId,
    }));
    const { error: insErr } = await supabase
      .from('user_segments')
      .upsert(insertRows, { onConflict: 'user_id,segment_id' });
    if (insErr) throw insErr;
  }

  return { added: toAdd, removed: toRemove };
}

/**
 * Save targets for a member across multiple segments and periods.
 */
export async function saveMemberTargets(userId: string, targetsList: any[] = []): Promise<any[]> {
  const withUser = (targetsList || []).map((t) => ({
    ...t,
    userId,
    user_id: userId,
  }));
  return await bulkUpsertTargets(withUser);
}

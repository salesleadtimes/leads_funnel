import { createSupabaseBrowserClient } from '../supabase/client';
import {
  getMemberTargetsByUser,
  upsertMemberTarget,
  getTargetAchievement,
  derivePeriodTargets,
  MemberTarget,
} from './targetsService';
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
  /** member_targets rows for this user+year — one per segment */
  memberTargets: MemberTarget[];
  achievements: Record<string, Record<string, any>>;
}

/**
 * Fetch all team members with assigned segments and target overview.
 */
export async function getMembersList(): Promise<MemberListItem[]> {
  const [
    { data: profiles, error: profErr },
    { data: userSegs, error: segErr },
    { data: memberTargets, error: targetErr }
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, email, full_name, role, phone, is_active, created_at')
      .order('full_name', { ascending: true }),
    supabase
      .from('user_segments')
      .select('user_id, segment_id, segments(id, code, name, is_active)'),
    supabase
      .from('member_targets')
      .select('id, segment_id, user_id, year, daily_target_amount')
      .not('user_id', 'is', null)
      .eq('year', new Date().getFullYear())
  ]);

  if (profErr) throw profErr;
  if (segErr) console.warn('[memberService] user_segments fetch error:', segErr);
  if (targetErr) console.warn('[memberService] member_targets fetch error:', targetErr);

  // Group segments by user_id
  const segmentsByUser: Record<string, any[]> = {};
  ((userSegs || []) as any[]).forEach((us) => {
    if (!segmentsByUser[us.user_id]) segmentsByUser[us.user_id] = [];
    if (us.segments) segmentsByUser[us.user_id].push(us.segments);
  });

  // Group member_targets by user_id
  const targetsByUser: Record<string, any[]> = {};
  ((memberTargets || []) as any[]).forEach((t) => {
    if (!targetsByUser[t.user_id]) targetsByUser[t.user_id] = [];
    targetsByUser[t.user_id].push(t);
  });

  return ((profiles || []) as any[]).map((prof) => {
    const userTargets = targetsByUser[prof.id] || [];
    const assigned = segmentsByUser[prof.id] || [];

    // Monthly target = sum of (daily_target_amount × 30) across all segments
    const monthlyTargetTotal = userTargets.reduce(
      (sum, t) => sum + (Number(t.daily_target_amount) || 0) * 30,
      0
    );

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
    memberTargets
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
    getMemberTargetsByUser(userId, year)
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
    memberTargets: memberTargets || [],
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
 * Save the daily target for a member for a specific segment and year.
 * This replaces the old saveMemberTargets which saved 5 period rows.
 */
export async function saveMemberDailyTarget(
  userId: string,
  segmentId: string,
  year: number,
  dailyTargetAmount: number
): Promise<MemberTarget> {
  return upsertMemberTarget({ userId, segmentId, year, dailyTargetAmount });
}

/**
 * @deprecated Use saveMemberDailyTarget instead.
 * Kept for backward compatibility — converts old 5-period payload to a single daily target.
 */
export async function saveMemberTargets(userId: string, targetsList: any[] = []): Promise<any[]> {
  const results: any[] = [];
  for (const t of targetsList) {
    const segId = t.segmentId || t.segment_id;
    const year = Number(t.year) || new Date().getFullYear();
    const periodType = (t.periodType || t.period_type || 'daily') as string;
    const rawValue = Number(t.targetValue ?? t.target_value) || 0;

    // Back-calculate daily from whatever period is given
    let dailyAmount = rawValue;
    if (periodType === 'weekly' || periodType === 'week') dailyAmount = rawValue / 7;
    else if (periodType === 'monthly' || periodType === 'month') dailyAmount = rawValue / 30;
    else if (periodType === 'quarterly' || periodType === 'quarter') dailyAmount = rawValue / 90;
    else if (periodType === 'yearly' || periodType === 'year') dailyAmount = rawValue / 365;

    const result = await upsertMemberTarget({
      userId,
      segmentId: segId,
      year,
      dailyTargetAmount: Math.round(dailyAmount * 100) / 100,
    });
    results.push(result);
  }
  return results;
}

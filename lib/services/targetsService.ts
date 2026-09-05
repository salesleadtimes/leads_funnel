import { createSupabaseBrowserClient } from '../supabase/client';
import { getPeriodRange, getPeriodValue, normalizePeriodType, PeriodType, PeriodRange } from '../utils/periodUtils';

const supabase = createSupabaseBrowserClient();

export interface TargetAchievementResult {
  targetId: string | null;
  targetValue: number;
  hasTarget: boolean;
  achievedValue: number;
  wonValue: number;
  lostValue: number;
  achievementPercentage: number;
  totalLeadsCount: number;
  wonLeadsCount: number;
  lostLeadsCount: number;
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
  periodKey: string;
  periodType: PeriodType;
  year: number;
  periodValue: number | null;
}

export interface GetTargetsParams {
  segmentId?: string | null;
  userId?: string | null;
  year?: number | null;
  periodType?: string | null;
  periodValue?: number | null;
}

export interface UpsertTargetParams {
  segmentId: string;
  userId?: string | null;
  year: number;
  periodType: string;
  periodValue?: number | null;
  targetValue: number;
}

// ============================================================================
// NEW: member_targets (single daily target per user+segment+year)
// ============================================================================

export interface MemberTarget {
  id: string;
  segment_id: string;
  user_id: string | null;
  year: number;
  daily_target_amount: number;
  created_at: string;
  updated_at: string;
}

export interface DerivedPeriodTargets {
  daily: number;
  weekly: number;
  monthly: number;
  quarterly: number;
  annual: number;
}

/**
 * Derive all period targets from a daily base amount.
 * Multipliers (per spec): weekly=×7, monthly=×30, quarterly=×90, annual=×365
 */
export function derivePeriodTargets(dailyAmount: number): DerivedPeriodTargets {
  const d = Math.max(0, Number(dailyAmount) || 0);
  return {
    daily: d,
    weekly: d * 7,
    monthly: d * 30,
    quarterly: d * 90,
    annual: d * 365,
  };
}

/**
 * Get a single member target row for (userId, segmentId, year).
 * Falls back to segment-wide target if no user-specific target exists.
 */
export async function getMemberTarget(
  userId: string | null,
  segmentId: string,
  year: number
): Promise<MemberTarget | null> {
  // First try user-specific target
  if (userId) {
    const { data: userTarget } = await supabase
      .from('member_targets')
      .select('*')
      .eq('segment_id', segmentId)
      .eq('user_id', userId)
      .eq('year', year)
      .maybeSingle();
    if (userTarget) return userTarget as MemberTarget;
  }

  // Fall back to segment-wide target (user_id IS NULL)
  const { data: fallback } = await supabase
    .from('member_targets')
    .select('*')
    .eq('segment_id', segmentId)
    .is('user_id', null)
    .eq('year', year)
    .maybeSingle();

  return (fallback as MemberTarget) || null;
}

/**
 * Get all member targets for a user across all their segments and years.
 */
export async function getMemberTargetsByUser(
  userId: string,
  year?: number | null
): Promise<MemberTarget[]> {
  let query = supabase
    .from('member_targets')
    .select('*, segments:segment_id(id, code, name)')
    .eq('user_id', userId);

  if (year) {
    query = query.eq('year', year);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as MemberTarget[];
}

/**
 * Get all member targets (owner view — can filter by segment, user, year).
 */
export async function getAllMemberTargets(params: {
  segmentId?: string | null;
  userId?: string | null;
  year?: number | null;
} = {}): Promise<MemberTarget[]> {
  let query = supabase
    .from('member_targets')
    .select('*, segments:segment_id(id, code, name), profiles:user_id(id, email, full_name)');

  if (params.segmentId) query = query.eq('segment_id', params.segmentId);
  if (params.userId !== undefined) {
    if (params.userId === null) {
      query = query.is('user_id', null);
    } else {
      query = query.eq('user_id', params.userId);
    }
  }
  if (params.year) query = query.eq('year', params.year);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as MemberTarget[];
}

/**
 * Upsert a single member target.
 * Uses ON CONFLICT on the unique constraint (segment_id, user_id, year).
 */
export async function upsertMemberTarget({
  userId = null,
  segmentId,
  year,
  dailyTargetAmount,
}: {
  userId?: string | null;
  segmentId: string;
  year: number;
  dailyTargetAmount: number;
}): Promise<MemberTarget> {
  const cleanAmount = Math.max(0, Number(dailyTargetAmount) || 0);
  const cleanYear = Number(year) || new Date().getFullYear();

  const row = {
    segment_id: segmentId,
    user_id: userId || null,
    year: cleanYear,
    daily_target_amount: cleanAmount,
  };

  // Try to find existing record first (avoid ON CONFLICT issues with NULL user_id)
  let findQuery = supabase
    .from('member_targets')
    .select('id')
    .eq('segment_id', segmentId)
    .eq('year', cleanYear);

  if (userId) {
    findQuery = findQuery.eq('user_id', userId);
  } else {
    findQuery = findQuery.is('user_id', null);
  }

  const { data: existing } = await findQuery.maybeSingle();

  if (existing?.id) {
    const { data: updated, error } = await supabase
      .from('member_targets')
      .update({ daily_target_amount: cleanAmount, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return updated as MemberTarget;
  } else {
    const { data: inserted, error } = await supabase
      .from('member_targets')
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return inserted as MemberTarget;
  }
}

// ============================================================================
// LEGACY: targets table functions (kept for backward compat / achievement queries)
// ============================================================================

/**
 * Fetch targets with optional filters.
 */
export async function getTargets({
  segmentId = null,
  userId = undefined,
  year = null,
  periodType = null,
  periodValue = undefined,
}: GetTargetsParams = {}): Promise<any[]> {
  let query = supabase.from('targets').select(`
    *,
    segments:segment_id(id, code, name),
    profiles:user_id(id, email, full_name)
  `);

  if (segmentId) {
    query = query.eq('segment_id', segmentId);
  }

  if (userId !== undefined) {
    if (userId === null) {
      query = query.is('user_id', null);
    } else {
      query = query.eq('user_id', userId);
    }
  }

  if (year) {
    query = query.eq('year', year);
  }

  if (periodType) {
    const norm = normalizePeriodType(periodType);
    query = query.in('period_type', [norm, periodType]);
  }

  if (periodValue !== undefined) {
    if (periodValue === null) {
      query = query.is('period_value', null);
    } else {
      query = query.eq('period_value', periodValue);
    }
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Get a specific target record value.
 */
export async function getTargetValue(
  segmentId: string,
  userId: string | null,
  year: number,
  periodType: string,
  periodValue: number | null = null
): Promise<number> {
  const norm = normalizePeriodType(periodType);
  let query = supabase
    .from('targets')
    .select('target_value')
    .eq('segment_id', segmentId)
    .eq('year', year)
    .in('period_type', [norm, periodType]);

  if (periodValue !== null && periodValue !== undefined) {
    query = query.eq('period_value', periodValue);
  } else {
    query = query.is('period_value', null);
  }

  if (userId) {
    query = query.eq('user_id', userId);
  } else {
    query = query.is('user_id', null);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data ? Number(data.target_value) : 0;
}

/**
 * Upsert a single target using safe match-and-update or insert.
 * Avoids Postgres 42P10 ON CONFLICT index mismatch errors across all schema variants.
 */
export async function upsertTarget({
  segmentId,
  userId = null,
  year,
  periodType,
  periodValue = null,
  targetValue,
}: UpsertTargetParams): Promise<any> {
  const norm = normalizePeriodType(periodType);
  const cleanYear = Number(year) || new Date().getFullYear();
  const cleanVal = Math.max(0, Number(targetValue) || 0);
  const cleanPeriodVal =
    periodValue !== undefined && periodValue !== null ? Number(periodValue) : null;

  // 1. Check if an existing record already exists for this (segment, user, year, period)
  let findQuery = supabase
    .from('targets')
    .select('id')
    .eq('segment_id', segmentId)
    .eq('year', cleanYear)
    .in('period_type', [norm, periodType]);

  if (userId) {
    findQuery = findQuery.eq('user_id', userId);
  } else {
    findQuery = findQuery.is('user_id', null);
  }

  if (cleanPeriodVal !== null) {
    findQuery = findQuery.eq('period_value', cleanPeriodVal);
  } else {
    findQuery = findQuery.is('period_value', null);
  }

  const { data: existing, error: findErr } = await findQuery.maybeSingle();
  if (findErr) {
    console.warn('[targetsService] find query warning:', findErr);
  }

  if (existing?.id) {
    // 2a. Update existing record
    const { data: updated, error: updateErr } = await supabase
      .from('targets')
      .update({
        target_value: cleanVal,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (updateErr) throw updateErr;
    return updated;
  } else {
    // 2b. Insert new record
    const { data: inserted, error: insertErr } = await supabase
      .from('targets')
      .insert({
        segment_id: segmentId,
        user_id: userId || null,
        year: cleanYear,
        period_type: norm,
        period_value: cleanPeriodVal,
        target_value: cleanVal,
      })
      .select()
      .single();

    if (insertErr) throw insertErr;
    return inserted;
  }
}

/**
 * Bulk upsert targets array safely.
 */
export async function bulkUpsertTargets(targetsList: any[] = []): Promise<any[]> {
  if (!Array.isArray(targetsList) || targetsList.length === 0) return [];

  const results: any[] = [];
  for (const t of targetsList) {
    const res = await upsertTarget({
      segmentId: t.segmentId || t.segment_id,
      userId: t.userId || t.user_id || null,
      year: Number(t.year) || new Date().getFullYear(),
      periodType: t.periodType || t.period_type,
      periodValue:
        t.periodValue !== undefined
          ? t.periodValue
          : t.period_value !== undefined
          ? t.period_value
          : null,
      targetValue: Number(t.targetValue ?? t.target_value) || 0,
    });
    results.push(res);
  }
  return results;
}

export interface TargetAchievementParams {
  userId?: string | null;
  segmentId: string;
  periodType?: PeriodType | string;
  refDate?: string | Date | null;
}

/**
 * Compute target achievement for a member + segment + period.
 * Now reads the daily target from member_targets and derives the period target
 * using the standard multipliers. Falls back to the legacy targets table if
 * no member_targets row exists (backward compat).
 *
 * Strict rules:
 *  - created_by = userId (if userId provided)
 *  - segment_id = segmentId
 *  - created_at >= periodStart AND created_at < periodEnd
 *  - deleted_at IS NULL
 */
export async function getTargetAchievement({
  userId = null,
  segmentId,
  periodType = 'monthly',
  refDate = null,
}: TargetAchievementParams): Promise<TargetAchievementResult> {
  const period = getPeriodRange(periodType, refDate);
  const norm = period.periodType;
  const year = period.year;

  // 1. Fetch target from member_targets (new model)
  let targetValue = 0;
  let hasTarget = false;
  let targetId: string | null = null;

  const memberTarget = await getMemberTarget(userId, segmentId, year);
  if (memberTarget && memberTarget.daily_target_amount > 0) {
    const derived = derivePeriodTargets(memberTarget.daily_target_amount);
    const periodKey = norm as keyof DerivedPeriodTargets;
    // Map period type to derived field
    const periodToKey: Record<PeriodType, keyof DerivedPeriodTargets> = {
      daily: 'daily',
      weekly: 'weekly',
      monthly: 'monthly',
      quarterly: 'quarterly',
      yearly: 'annual',
    };
    targetValue = derived[periodToKey[norm] || 'monthly'];
    hasTarget = true;
    targetId = memberTarget.id;
  } else {
    // Legacy fallback: read from old targets table
    let targetQuery = supabase
      .from('targets')
      .select('*')
      .eq('segment_id', segmentId)
      .eq('year', year)
      .in('period_type', [norm, periodType]);

    if (period.periodValue !== null) {
      targetQuery = targetQuery.eq('period_value', period.periodValue);
    } else {
      targetQuery = targetQuery.is('period_value', null);
    }

    if (userId) {
      targetQuery = targetQuery.eq('user_id', userId);
    } else {
      targetQuery = targetQuery.is('user_id', null);
    }

    const { data: targetRows, error: targetErr } = await targetQuery;
    if (targetErr) console.warn('[targetsService] Target query error:', targetErr);

    let targetRecord = targetRows && targetRows.length > 0 ? targetRows[0] : null;

    // If member has no target, check segment fallback target if applicable
    if (!targetRecord && userId) {
      const { data: fallbackRows } = await supabase
        .from('targets')
        .select('*')
        .eq('segment_id', segmentId)
        .is('user_id', null)
        .eq('year', year)
        .in('period_type', [norm, periodType])
        .maybeSingle();

      if (fallbackRows) {
        targetRecord = fallbackRows;
      }
    }

    targetValue = targetRecord ? Number(targetRecord.target_value) || 0 : 0;
    hasTarget = Boolean(targetRecord);
    targetId = targetRecord?.id || null;
  }

  // 2. Query leads created by the member in this segment within the period
  let leadsQuery = supabase
    .from('leads')
    .select(`
      id, est_value, created_at, closed_date, created_by,
      lead_stages:stage_id(id, name, is_won, is_lost)
    `)
    .eq('segment_id', segmentId)
    .is('deleted_at', null)
    .gte('created_at', period.start)
    .lt('created_at', period.end);

  if (userId) {
    leadsQuery = leadsQuery.eq('created_by', userId);
  }

  const { data: leads, error: leadsErr } = await leadsQuery;
  if (leadsErr) throw leadsErr;

  const validLeads = (leads || []) as any[];
  const achievedValue = validLeads.reduce((s, l) => s + (Number(l.est_value) || 0), 0);

  const wonLeads = validLeads.filter(
    (l) => l.lead_stages?.is_won || l.lead_stages?.name === 'Won'
  );
  const wonValue = wonLeads.reduce((s, l) => s + (Number(l.est_value) || 0), 0);

  const lostLeads = validLeads.filter(
    (l) => l.lead_stages?.is_lost || l.lead_stages?.name === 'Lost'
  );
  const lostValue = lostLeads.reduce((s, l) => s + (Number(l.est_value) || 0), 0);

  const percentage =
    targetValue > 0 ? Math.round((achievedValue / targetValue) * 100) : 0;

  return {
    targetId,
    targetValue,
    hasTarget,
    achievedValue,
    wonValue,
    lostValue,
    achievementPercentage: percentage,
    totalLeadsCount: validLeads.length,
    wonLeadsCount: wonLeads.length,
    lostLeadsCount: lostLeads.length,
    periodStart: period.start,
    periodEnd: period.end,
    periodLabel: period.label,
    periodKey: period.key,
    periodType: norm,
    year: period.year,
    periodValue: period.periodValue,
  };
}

export async function updateTargets(targets: any): Promise<any> {
  if (!targets || typeof targets !== 'object') return targets;
  return targets;
}

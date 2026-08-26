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

  // 1. Fetch matching target
  let targetQuery = supabase
    .from('targets')
    .select('*')
    .eq('segment_id', segmentId)
    .eq('year', period.year)
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
      .eq('year', period.year)
      .in('period_type', [norm, periodType])
      .maybeSingle();

    if (fallbackRows) {
      targetRecord = fallbackRows;
    }
  }

  const targetValue = targetRecord ? Number(targetRecord.target_value) || 0 : 0;
  const hasTarget = Boolean(targetRecord);

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
    targetId: targetRecord?.id || null,
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

import { createSupabaseBrowserClient } from '../supabase/client';

const supabase = createSupabaseBrowserClient();


/**
 * Fetch all targets for a segment.
 * @param {string} segmentId
 * @param {string|null} userId - null = segment-wide targets only
 */
export async function getTargets(segmentId, userId = null) {
  let query = supabase
    .from('targets')
    .select('*')
    .eq('segment_id', segmentId);

  if (userId) {
    query = query.eq('user_id', userId);
  } else {
    query = query.is('user_id', null);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Get a specific period target value.
 * @param {string} segmentId
 * @param {string|null} userId
 * @param {number} year
 * @param {'month'|'quarter'|'year'} periodType
 * @param {number|null} periodValue
 */
export async function getTargetValue(segmentId, userId, year, periodType, periodValue = null) {
  let query = supabase
    .from('targets')
    .select('target_value')
    .eq('segment_id', segmentId)
    .eq('year', year)
    .eq('period_type', periodType);

  if (periodValue !== null) query = query.eq('period_value', periodValue);
  else query = query.is('period_value', null);

  if (userId) query = query.eq('user_id', userId);
  else query = query.is('user_id', null);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data ? Number(data.target_value) : 0;
}

/**
 * Upsert a target (insert or update on conflict via partial unique index).
 */
export async function upsertTarget({ segmentId, userId = null, year, periodType, periodValue = null, targetValue }) {
  const row = {
    segment_id:   segmentId,
    user_id:      userId,
    year,
    period_type:  periodType,
    period_value: periodValue,
    target_value: Number(targetValue) || 0,
  };

  const { data, error } = await supabase
    .from('targets')
    .upsert(row, {
      onConflict: userId
        ? 'segment_id,user_id,year,period_type,period_value'
        : 'segment_id,year,period_type,period_value',
      ignoreDuplicates: false
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Compute target achievement for a segment/user in a given year.
 * Returns { target, achieved, percentage } for each period type found.
 */
export async function getTargetAchievement(segmentId, userId, year = new Date().getFullYear()) {
  const [targets, { data: leads, error: leadsErr }] = await Promise.all([
    getTargets(segmentId, userId),
    supabase
      .from('leads')
      .select('est_value, created_at')
      .eq('segment_id', segmentId)
      .eq('assigned_to', userId)
      .is('deleted_at', null)
      .gte('created_at', `${year}-01-01`)
      .lt('created_at', `${year + 1}-01-01`)
  ]);

  if (leadsErr) throw leadsErr;
  const totalAchieved = (leads || []).reduce((s, l) => s + (Number(l.est_value) || 0), 0);
  const yearTarget = targets.find(t => t.period_type === 'year')?.target_value || 0;

  return {
    targets,
    totalAchieved,
    yearTarget: Number(yearTarget),
    percentage: yearTarget > 0 ? Math.round((totalAchieved / yearTarget) * 100) : 0
  };
}

export async function updateTargets(targets) {
  if (!targets || typeof targets !== 'object') return targets;
  return targets;
}


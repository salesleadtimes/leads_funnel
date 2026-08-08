import { getDbMode, getSupabase, getSql } from '../db/client';
import { seedState } from '../seed';

let memoryTargets = null;

function getMemoryTargets() {
  if (!memoryTargets) {
    memoryTargets = seedState().targets;
  }
  return memoryTargets;
}

export async function getTargets() {
  const mode = getDbMode();

  if (mode === 'supabase') {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('targets').select('*').eq('id', 'default').single();
    if (error && error.code !== 'PGRST116') throw error;
    if (data) {
      return {
        daily: Number(data.daily),
        weekly: Number(data.weekly),
        monthly: Number(data.monthly),
        quarterly: Number(data.quarterly),
        yearly: Number(data.yearly)
      };
    }
    const initial = seedState().targets;
    await updateTargets(initial);
    return initial;
  }

  if (mode === 'postgres') {
    const sql = getSql();
    const [row] = await sql`SELECT * FROM targets WHERE id = 'default'`;
    if (row) {
      return {
        daily: Number(row.daily),
        weekly: Number(row.weekly),
        monthly: Number(row.monthly),
        quarterly: Number(row.quarterly),
        yearly: Number(row.yearly)
      };
    }
    const initial = seedState().targets;
    await updateTargets(initial);
    return initial;
  }

  return getMemoryTargets();
}

export async function updateTargets(targets) {
  const mode = getDbMode();
  const row = {
    id: 'default',
    daily: Number(targets.daily) || 15000,
    weekly: Number(targets.weekly) || 100000,
    monthly: Number(targets.monthly) || 400000,
    quarterly: Number(targets.quarterly) || 1200000,
    yearly: Number(targets.yearly) || 5000000
  };

  if (mode === 'supabase') {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('targets').upsert(row).select().single();
    if (error) throw error;
    return {
      daily: Number(data.daily),
      weekly: Number(data.weekly),
      monthly: Number(data.monthly),
      quarterly: Number(data.quarterly),
      yearly: Number(data.yearly)
    };
  }

  if (mode === 'postgres') {
    const sql = getSql();
    const [updated] = await sql`
      INSERT INTO targets ${sql(row)}
      ON CONFLICT (id) DO UPDATE SET
        daily = EXCLUDED.daily,
        weekly = EXCLUDED.weekly,
        monthly = EXCLUDED.monthly,
        quarterly = EXCLUDED.quarterly,
        yearly = EXCLUDED.yearly
      RETURNING *
    `;
    return {
      daily: Number(updated.daily),
      weekly: Number(updated.weekly),
      monthly: Number(updated.monthly),
      quarterly: Number(updated.quarterly),
      yearly: Number(updated.yearly)
    };
  }

  memoryTargets = row;
  return row;
}

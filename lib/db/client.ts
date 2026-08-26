import { createClient, SupabaseClient } from '@supabase/supabase-js';
import postgres from 'postgres';

let supabaseClient: SupabaseClient | null = null;
let sqlClient: ReturnType<typeof postgres> | null = null;

export function getDbMode(): 'supabase' | 'postgres' | 'memory' {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    return 'supabase';
  }

  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (dbUrl) {
    return 'postgres';
  }

  return 'memory';
}

export function getSupabase(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  supabaseClient = createClient(url, key);
  return supabaseClient;
}

export function getSql(): ReturnType<typeof postgres> | null {
  if (sqlClient) return sqlClient;
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!dbUrl) return null;
  sqlClient = postgres(dbUrl, { ssl: dbUrl.includes('localhost') ? false : 'require' });
  return sqlClient;
}

import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * Browser (client-side) Supabase client.
 * Safe to import inside 'use client' components and client utilities.
 */
export function createSupabaseBrowserClient() {
  if (!supabaseUrl || !supabaseAnon) {
    console.warn('[Supabase Client] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  return createBrowserClient(supabaseUrl, supabaseAnon);
}

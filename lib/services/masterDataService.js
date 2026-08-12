'use client';

import { createSupabaseBrowserClient } from '../supabase/client';

const supabase = createSupabaseBrowserClient();

/**
 * Fetch product categories for a given segment (segment-scoped via junction table).
 * Returns sorted by display_order.
 */
export async function fetchCategoriesBySegment(segmentId) {
  if (!segmentId) return [];
  const { data, error } = await supabase
    .from('segment_product_categories')
    .select('display_order, product_categories(id, code, name)')
    .eq('segment_id', segmentId)
    .order('display_order');
  if (error) throw error;
  return (data || []).map(r => r.product_categories).filter(Boolean);
}

/**
 * Fetch lead sources available for a given segment.
 */
export async function fetchSourcesBySegment(segmentId) {
  if (!segmentId) return [];
  const { data, error } = await supabase
    .from('segment_lead_sources')
    .select('lead_sources(id, code, name)')
    .eq('segment_id', segmentId);
  if (error) throw error;
  return (data || []).map(r => r.lead_sources).filter(Boolean);
}

/**
 * Fetch pipeline stages available for a given segment.
 */
export async function fetchStagesBySegment(segmentId) {
  if (!segmentId) return [];
  const { data, error } = await supabase
    .from('segment_lead_stages')
    .select('display_order, lead_stages(id, code, name, is_won, is_lost)')
    .eq('segment_id', segmentId)
    .order('display_order');
  if (error) throw error;
  return (data || []).map(r => r.lead_stages).filter(Boolean);
}

/**
 * Fetch all active sectors (global — not segment-scoped).
 */
export async function fetchSectors() {
  const { data, error } = await supabase
    .from('sectors')
    .select('id, name')
    .eq('is_active', true)
    .order('display_order');
  if (error) throw error;
  return data || [];
}

/**
 * Fetch all active segments the current user is allowed to see (RLS enforced).
 */
export async function fetchSegments() {
  const { data, error } = await supabase
    .from('segments')
    .select('id, code, name, description')
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return data || [];
}

// ============================================================================
// Owner-only admin functions
// ============================================================================

export async function createSegment({ code, name, description = '' }) {
  const { data, error } = await supabase
    .from('segments')
    .insert({ code, name, description })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createCategory({ code, name, description = '' }) {
  const { data, error } = await supabase
    .from('product_categories')
    .insert({ code, name, description })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function mapCategoryToSegment(segmentId, categoryId) {
  const { error } = await supabase
    .from('segment_product_categories')
    .insert({ segment_id: segmentId, category_id: categoryId })
    .select();
  if (error && error.code !== '23505') throw error; // ignore duplicate
}

export async function createLeadSource({ code, name }) {
  const { data, error } = await supabase
    .from('lead_sources')
    .insert({ code, name })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function mapSourceToSegment(segmentId, sourceId) {
  const { error } = await supabase
    .from('segment_lead_sources')
    .insert({ segment_id: segmentId, source_id: sourceId })
    .select();
  if (error && error.code !== '23505') throw error;
}

export async function fetchAllProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, is_active')
    .order('full_name');
  if (error) throw error;
  return data || [];
}

export async function assignSegmentToUser(userId, segmentId) {
  const { error } = await supabase
    .from('user_segments')
    .insert({ user_id: userId, segment_id: segmentId });
  if (error && error.code !== '23505') throw error;
}

export async function removeSegmentFromUser(userId, segmentId) {
  const { error } = await supabase
    .from('user_segments')
    .delete()
    .match({ user_id: userId, segment_id: segmentId });
  if (error) throw error;
}

export async function fetchUserSegments(userId) {
  const { data, error } = await supabase
    .from('user_segments')
    .select('segment_id, segments(id, code, name)')
    .eq('user_id', userId);
  if (error) throw error;
  return (data || []).map(r => r.segments).filter(Boolean);
}

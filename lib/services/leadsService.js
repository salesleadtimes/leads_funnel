'use client';

import { createSupabaseBrowserClient } from '../supabase/client';

const supabase = createSupabaseBrowserClient();

// ============================================================================
// MAPPERS
// ============================================================================
export function mapRowToLead(row) {
  if (!row) return null;
  return {
    id:             row.id,
    leadNumber:     row.lead_number || '',
    segmentId:      row.segment_id || '',
    orgName:        row.org_name || '',
    sectorId:       row.sector_id || null,
    deptIndustry:   row.dept_industry || '',
    contactPerson:  row.contact_person || '',
    phone:          row.phone || '',
    email:          row.email || '',
    categoryId:     row.category_id || '',
    modelDetails:   row.model_details || '',
    qty:            Number(row.qty) || 1,
    estValue:       Number(row.est_value) || 0,
    sourceId:       row.source_id || '',
    stageId:        row.stage_id || '',
    assignedTo:     row.assigned_to || null,
    createdBy:      row.created_by || null,
    expectedClose:  row.expected_close ? String(row.expected_close).slice(0, 10) : null,
    nextFollowUp:   row.next_follow_up ? String(row.next_follow_up).slice(0, 10) : null,
    remarks:        row.remarks || '',
    createdAt:      row.created_at || null,
    updatedAt:      row.updated_at || null,
    closedDate:     row.closed_date ? String(row.closed_date).slice(0, 10) : null,
    deletedAt:      row.deleted_at || null,
    // Joined data (when using select with relations)
    segment:        row.segments || null,
    category:       row.product_categories || null,
    source:         row.lead_sources || null,
    stage:          row.lead_stages || null,
    assignedProfile: row.profiles || null,
    gemBid:         row.gem_bids || null,
  };
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all non-deleted leads for the active segment.
 * RLS ensures members only get their segment's data.
 */
export async function getLeads({ segmentId = null, includeGemBids = true } = {}) {
  let query = supabase
    .from('leads')
    .select(`
      *,
      segments(id, code, name),
      product_categories(id, code, name),
      lead_sources(id, code, name),
      lead_stages(id, code, name, is_won, is_lost),
      profiles!leads_assigned_to_fkey(id, full_name, email),
      ${includeGemBids ? 'gem_bids(*)' : ''}
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (segmentId) {
    query = query.eq('segment_id', segmentId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapRowToLead);
}

/**
 * Get a single lead by ID with full joins.
 */
export async function getLeadById(id) {
  const { data, error } = await supabase
    .from('leads')
    .select(`
      *,
      segments(id, code, name),
      product_categories(id, code, name),
      lead_sources(id, code, name),
      lead_stages(id, code, name, is_won, is_lost),
      profiles!leads_assigned_to_fkey(id, full_name, email),
      gem_bids(*),
      lead_stage_history(*, lead_stages!lead_stage_history_to_stage_id_fkey(name))
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single();
  if (error) throw error;
  return mapRowToLead(data);
}

/**
 * Create a new lead (lead_number auto-assigned by DB trigger).
 * @param {Object} lead - camelCase lead fields
 * @param {Object|null} gemBid - optional gem bid data
 */
export async function createLead(lead, gemBid = null) {
  const row = {
    segment_id:     lead.segmentId,
    org_name:       lead.orgName,
    sector_id:      lead.sectorId || null,
    dept_industry:  lead.deptIndustry || '',
    contact_person: lead.contactPerson || '',
    phone:          lead.phone || '',
    email:          lead.email || '',
    category_id:    lead.categoryId,
    model_details:  lead.modelDetails || '',
    qty:            Number(lead.qty) || 1,
    est_value:      Number(lead.estValue) || 0,
    source_id:      lead.sourceId,
    stage_id:       lead.stageId,
    assigned_to:    lead.assignedTo || null,
    expected_close: lead.expectedClose || null,
    next_follow_up: lead.nextFollowUp || null,
    remarks:        lead.remarks || '',
  };

  const { data, error } = await supabase
    .from('leads')
    .insert(row)
    .select()
    .single();
  if (error) throw error;

  // Insert gem_bid if provided
  if (gemBid && gemBid.gemBidNumber) {
    await upsertGemBid(data.id, gemBid);
  }

  return mapRowToLead(data);
}

/**
 * Update an existing lead by ID.
 */
export async function updateLead(id, patch, gemBidPatch = null) {
  const row = {};
  if (patch.orgName       !== undefined) row.org_name       = patch.orgName;
  if (patch.sectorId      !== undefined) row.sector_id      = patch.sectorId;
  if (patch.deptIndustry  !== undefined) row.dept_industry  = patch.deptIndustry;
  if (patch.contactPerson !== undefined) row.contact_person = patch.contactPerson;
  if (patch.phone         !== undefined) row.phone          = patch.phone;
  if (patch.email         !== undefined) row.email          = patch.email;
  if (patch.categoryId    !== undefined) row.category_id    = patch.categoryId;
  if (patch.modelDetails  !== undefined) row.model_details  = patch.modelDetails;
  if (patch.qty           !== undefined) row.qty            = Number(patch.qty);
  if (patch.estValue      !== undefined) row.est_value      = Number(patch.estValue);
  if (patch.sourceId      !== undefined) row.source_id      = patch.sourceId;
  if (patch.stageId       !== undefined) row.stage_id       = patch.stageId;
  if (patch.assignedTo    !== undefined) row.assigned_to    = patch.assignedTo;
  if (patch.expectedClose !== undefined) row.expected_close = patch.expectedClose;
  if (patch.nextFollowUp  !== undefined) row.next_follow_up = patch.nextFollowUp;
  if (patch.remarks       !== undefined) row.remarks        = patch.remarks;
  if (patch.closedDate    !== undefined) row.closed_date    = patch.closedDate;

  const { data, error } = await supabase
    .from('leads')
    .update(row)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;

  if (gemBidPatch) {
    await upsertGemBid(id, gemBidPatch);
  }

  return mapRowToLead(data);
}

/**
 * Soft-delete a lead (sets deleted_at = NOW()).
 * Use this for all member-initiated deletes.
 */
export async function softDeleteLead(id) {
  const { error } = await supabase
    .from('leads')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
  return true;
}

/**
 * Hard delete — owner only (enforced by RLS policy).
 */
export async function hardDeleteLead(id) {
  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return true;
}

// ============================================================================
// GEM BIDS
// ============================================================================
export async function upsertGemBid(leadId, gemBid) {
  const row = {
    lead_id:        leadId,
    gem_bid_number: gemBid.gemBidNumber || '',
    tender_ref:     gemBid.tenderRef || '',
    bid_end_date:   gemBid.bidEndDate || null,
    bid_status:     gemBid.bidStatus || 'draft',
    emd_amount:     Number(gemBid.emdAmount) || 0,
    emd_status:     gemBid.emdStatus || 'not_required',
  };
  const { data, error } = await supabase
    .from('gem_bids')
    .upsert(row, { onConflict: 'lead_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================================================================
// STAGE HISTORY
// ============================================================================
export async function getLeadStageHistory(leadId) {
  const { data, error } = await supabase
    .from('lead_stage_history')
    .select(`
      id, changed_at, remarks,
      from_stage:lead_stages!lead_stage_history_from_stage_id_fkey(name),
      to_stage:lead_stages!lead_stage_history_to_stage_id_fkey(name),
      changed_by:profiles(full_name)
    `)
    .eq('lead_id', leadId)
    .order('changed_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

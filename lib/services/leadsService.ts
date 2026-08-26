import { createSupabaseBrowserClient } from '../supabase/client';

const supabase = createSupabaseBrowserClient();

export interface LeadModel {
  id: string;
  leadNumber: string;
  segmentId: string;
  orgName: string;
  sectorId: string | null;
  deptIndustry: string;
  contactPerson: string;
  phone: string;
  email: string;
  categoryId: string;
  modelDetails: string;
  qty: number;
  estValue: number;
  sourceId: string;
  stageId: string;
  assignedTo: string | null;
  createdBy: string | null;
  expectedClose: string | null;
  nextFollowUp: string | null;
  remarks: string;
  createdAt: string | null;
  updatedAt: string | null;
  closedDate: string | null;
  deletedAt: string | null;
  segment?: any;
  category?: any;
  source?: any;
  stage?: any;
  sector?: any;
  assignedProfile?: any;
  gemBid?: any;
  [key: string]: any;
}

// ============================================================================
// MAPPERS
// ============================================================================
export function mapRowToLead(row: any): LeadModel | null {
  if (!row) return null;
  return {
    id: row.id,
    leadNumber: row.lead_number || '',
    segmentId: row.segment_id || '',
    orgName: row.org_name || '',
    sectorId: row.sector_id || null,
    deptIndustry: row.dept_industry || '',
    contactPerson: row.contact_person || '',
    phone: row.phone || '',
    email: row.email || '',
    categoryId: row.category_id || '',
    modelDetails: row.model_details || '',
    qty: Number(row.qty) || 1,
    estValue: Number(row.est_value) || 0,
    sourceId: row.source_id || '',
    stageId: row.stage_id || '',
    assignedTo: row.assigned_to || null,
    createdBy: row.created_by || null,
    expectedClose: row.expected_close ? String(row.expected_close).slice(0, 10) : null,
    nextFollowUp: row.next_follow_up ? String(row.next_follow_up).slice(0, 10) : null,
    remarks: row.remarks || '',
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
    closedDate: row.closed_date ? String(row.closed_date).slice(0, 10) : null,
    deletedAt: row.deleted_at || null,
    // Joined data
    segment: row.segments || null,
    category:
      row.product_categories ||
      row.segment_product_categories?.product_categories ||
      null,
    source:
      row.lead_sources || row.segment_lead_sources?.lead_sources || null,
    stage:
      row.lead_stages || row.segment_lead_stages?.lead_stages || null,
    sector: row.sectors || null,
    assignedProfile:
      row.assigned_profile ||
      row.profiles ||
      row.profiles_leads_assigned_to_fkey ||
      null,
    gemBid: row.gem_bids || null,
  };
}

// ============================================================================
// QUERIES
// ============================================================================

export interface GetLeadsOptions {
  segmentId?: string | null;
  includeGemBids?: boolean;
}

/**
 * Get all non-deleted leads for the active segment.
 * RLS ensures members only get their segment's data.
 */
export async function getLeads({
  segmentId = null,
  includeGemBids = true,
}: GetLeadsOptions = {}): Promise<LeadModel[]> {
  let query = supabase
    .from('leads')
    .select(`
      *,
      segments(id, code, name),
      sectors(id, name),
      segment_product_categories!fk_leads_segment_category(product_categories(id, code, name)),
      segment_lead_sources!fk_leads_segment_source(lead_sources(id, code, name)),
      segment_lead_stages!fk_leads_segment_stage(lead_stages(id, code, name, is_won, is_lost)),
      assigned_profile:profiles!leads_assigned_to_fkey(id, full_name, email),
      ${includeGemBids ? 'gem_bids(*)' : ''}
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (segmentId) {
    query = query.eq('segment_id', segmentId);
  }

  const { data, error } = await query;
  if (error) {
    // Graceful fallback query
    let fallbackQuery = supabase
      .from('leads')
      .select(`
        *,
        segments(id, code, name),
        assigned_profile:profiles!leads_assigned_to_fkey(id, full_name, email),
        ${includeGemBids ? 'gem_bids(*)' : ''}
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (segmentId) fallbackQuery = fallbackQuery.eq('segment_id', segmentId);
    const res = await fallbackQuery;
    if (res.error) throw error;
    return (res.data || []).map(mapRowToLead).filter(Boolean) as LeadModel[];
  }
  return (data || []).map(mapRowToLead).filter(Boolean) as LeadModel[];
}

/**
 * Get a single lead by ID with full joins.
 */
export async function getLeadById(id: string): Promise<LeadModel | null> {
  const { data, error } = await supabase
    .from('leads')
    .select(`
      *,
      segments(id, code, name),
      sectors(id, name),
      segment_product_categories!fk_leads_segment_category(product_categories(id, code, name)),
      segment_lead_sources!fk_leads_segment_source(lead_sources(id, code, name)),
      segment_lead_stages!fk_leads_segment_stage(lead_stages(id, code, name, is_won, is_lost)),
      assigned_profile:profiles!leads_assigned_to_fkey(id, full_name, email),
      gem_bids(*)
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single();
  if (error) throw error;
  return mapRowToLead(data);
}

/**
 * Create a new lead (lead_number auto-assigned by DB trigger).
 */
export async function createLead(lead: Record<string, any>, gemBid: Record<string, any> | null = null): Promise<LeadModel | null> {
  let assignedUser = lead.assignedTo || null;
  let createdUser: string | null = null;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      createdUser = user.id;
      if (!assignedUser) assignedUser = user.id;
    }
  } catch (err) {
    console.error('Failed to fetch auth user during lead creation:', err);
  }

  const row = {
    segment_id: lead.segmentId,
    org_name: lead.orgName,
    sector_id: lead.sectorId || null,
    dept_industry: lead.deptIndustry || '',
    contact_person: lead.contactPerson || '',
    phone: lead.phone || '',
    email: lead.email || '',
    category_id: lead.categoryId,
    model_details: lead.modelDetails || '',
    qty: Number(lead.qty) || 1,
    est_value: Number(lead.estValue) || 0,
    source_id: lead.sourceId,
    stage_id: lead.stageId,
    assigned_to: assignedUser,
    created_by: createdUser,
    expected_close: lead.expectedClose || null,
    next_follow_up: lead.nextFollowUp || null,
    remarks: lead.remarks || '',
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
export async function updateLead(
  id: string,
  patch: Record<string, any>,
  gemBidPatch: Record<string, any> | null = null
): Promise<LeadModel | null> {
  const row: Record<string, any> = {};
  if (patch.orgName !== undefined) row.org_name = patch.orgName;
  if (patch.sectorId !== undefined) row.sector_id = patch.sectorId;
  if (patch.deptIndustry !== undefined) row.dept_industry = patch.deptIndustry;
  if (patch.contactPerson !== undefined) row.contact_person = patch.contactPerson;
  if (patch.phone !== undefined) row.phone = patch.phone;
  if (patch.email !== undefined) row.email = patch.email;
  if (patch.categoryId !== undefined) row.category_id = patch.categoryId;
  if (patch.modelDetails !== undefined) row.model_details = patch.modelDetails;
  if (patch.qty !== undefined) row.qty = Number(patch.qty);
  if (patch.estValue !== undefined) row.est_value = Number(patch.estValue);
  if (patch.sourceId !== undefined) row.source_id = patch.sourceId;
  if (patch.stageId !== undefined) row.stage_id = patch.stageId;
  if (patch.assignedTo !== undefined) row.assigned_to = patch.assignedTo;
  if (patch.expectedClose !== undefined) row.expected_close = patch.expectedClose;
  if (patch.nextFollowUp !== undefined) row.next_follow_up = patch.nextFollowUp;
  if (patch.remarks !== undefined) row.remarks = patch.remarks;
  if (patch.closedDate !== undefined) row.closed_date = patch.closedDate;

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
 */
export async function softDeleteLead(id: string): Promise<boolean> {
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
export async function hardDeleteLead(id: string): Promise<boolean> {
  const { error } = await supabase.from('leads').delete().eq('id', id);
  if (error) throw error;
  return true;
}

export const deleteLead = softDeleteLead;

// ============================================================================
// GEM BIDS
// ============================================================================
export async function upsertGemBid(leadId: string, gemBid: Record<string, any>): Promise<any> {
  const row = {
    lead_id: leadId,
    gem_bid_number: gemBid.gemBidNumber || '',
    tender_ref: gemBid.tenderRef || '',
    bid_end_date: gemBid.bidEndDate || null,
    bid_status: gemBid.bidStatus || 'draft',
    emd_amount: Number(gemBid.emdAmount) || 0,
    emd_status: gemBid.emdStatus || 'not_required',
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
export async function getLeadStageHistory(leadId: string): Promise<any[]> {
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

export async function saveAllLeads(leads: any[]): Promise<any[]> {
  if (!Array.isArray(leads)) return [];
  const results = [];
  for (const lead of leads) {
    if (lead.id) {
      results.push(await updateLead(lead.id, lead));
    } else {
      results.push(await createLead(lead));
    }
  }
  return results;
}

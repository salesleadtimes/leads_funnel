import { getDbMode, getSupabase, getSql } from '../db/client';
import { seedState } from '../seed';

// Memory store fallback if DB is not configured locally yet
let memoryState = null;

function getMemoryState() {
  if (!memoryState) {
    memoryState = seedState();
  }
  return memoryState;
}

// Convert snake_case DB row -> camelCase JS lead
export function mapRowToLead(row) {
  if (!row) return null;
  return {
    id: row.id,
    orgName: row.org_name || '',
    sector: row.sector || '',
    deptIndustry: row.dept_industry || '',
    contactPerson: row.contact_person || '',
    phone: row.phone || '',
    email: row.email || '',
    productCategory: row.product_category || '',
    model: row.model || '',
    qty: Number(row.qty) || 1,
    estValue: Number(row.est_value) || 0,
    source: row.source || '',
    tenderRef: row.tender_ref || '',
    stage: row.stage || 'New Lead',
    expectedClose: row.expected_close ? String(row.expected_close).slice(0, 10) : null,
    nextFollowUp: row.next_follow_up ? String(row.next_follow_up).slice(0, 10) : null,
    salesPerson: row.sales_person || '',
    remarks: row.remarks || '',
    createdDate: row.created_date ? String(row.created_date).slice(0, 10) : new Date().toISOString().slice(0, 10),
    closedDate: row.closed_date ? String(row.closed_date).slice(0, 10) : null
  };
}

// Convert camelCase JS lead -> snake_case DB object
export function mapLeadToRow(lead) {
  return {
    id: lead.id,
    org_name: lead.orgName || '',
    sector: lead.sector || '',
    dept_industry: lead.deptIndustry || '',
    contact_person: lead.contactPerson || '',
    phone: lead.phone || '',
    email: lead.email || '',
    product_category: lead.productCategory || '',
    model: lead.model || '',
    qty: Number(lead.qty) || 1,
    est_value: Number(lead.estValue) || 0,
    source: lead.source || '',
    tender_ref: lead.tenderRef || '',
    stage: lead.stage || 'New Lead',
    expected_close: lead.expectedClose || null,
    next_follow_up: lead.nextFollowUp || null,
    sales_person: lead.salesPerson || '',
    remarks: lead.remarks || '',
    created_date: lead.createdDate || new Date().toISOString().slice(0, 10),
    closed_date: lead.closedDate || null
  };
}

export async function getLeads() {
  const mode = getDbMode();

  if (mode === 'supabase') {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('leads').select('*').order('created_date', { ascending: false });
    if (error) throw error;
    if (!data || data.length === 0) {
      // Auto-seed if empty
      const initial = seedState().leads;
      await seedLeads(initial);
      return initial;
    }
    return data.map(mapRowToLead);
  }

  if (mode === 'postgres') {
    const sql = getSql();
    const rows = await sql`SELECT * FROM leads ORDER BY created_date DESC`;
    if (!rows || rows.length === 0) {
      const initial = seedState().leads;
      await seedLeads(initial);
      return initial;
    }
    return rows.map(mapRowToLead);
  }

  // Memory mode
  return getMemoryState().leads;
}

export async function createLead(lead) {
  const mode = getDbMode();
  const row = mapLeadToRow(lead);

  if (mode === 'supabase') {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('leads').insert([row]).select().single();
    if (error) throw error;
    return mapRowToLead(data);
  }

  if (mode === 'postgres') {
    const sql = getSql();
    const [inserted] = await sql`
      INSERT INTO leads ${sql(row)}
      RETURNING *
    `;
    return mapRowToLead(inserted);
  }

  const mem = getMemoryState();
  mem.leads.unshift(lead);
  return lead;
}

export async function updateLead(id, patch) {
  const mode = getDbMode();

  if (mode === 'supabase') {
    const supabase = getSupabase();
    const row = {};
    if (patch.orgName !== undefined) row.org_name = patch.orgName;
    if (patch.sector !== undefined) row.sector = patch.sector;
    if (patch.deptIndustry !== undefined) row.dept_industry = patch.deptIndustry;
    if (patch.contactPerson !== undefined) row.contact_person = patch.contactPerson;
    if (patch.phone !== undefined) row.phone = patch.phone;
    if (patch.email !== undefined) row.email = patch.email;
    if (patch.productCategory !== undefined) row.product_category = patch.productCategory;
    if (patch.model !== undefined) row.model = patch.model;
    if (patch.qty !== undefined) row.qty = Number(patch.qty);
    if (patch.estValue !== undefined) row.est_value = Number(patch.estValue);
    if (patch.source !== undefined) row.source = patch.source;
    if (patch.tenderRef !== undefined) row.tender_ref = patch.tenderRef;
    if (patch.stage !== undefined) row.stage = patch.stage;
    if (patch.expectedClose !== undefined) row.expected_close = patch.expectedClose;
    if (patch.nextFollowUp !== undefined) row.next_follow_up = patch.nextFollowUp;
    if (patch.salesPerson !== undefined) row.sales_person = patch.salesPerson;
    if (patch.remarks !== undefined) row.remarks = patch.remarks;
    if (patch.closedDate !== undefined) row.closed_date = patch.closedDate;

    const { data, error } = await supabase.from('leads').update(row).eq('id', id).select().single();
    if (error) throw error;
    return mapRowToLead(data);
  }

  if (mode === 'postgres') {
    const sql = getSql();
    const row = {};
    if (patch.orgName !== undefined) row.org_name = patch.orgName;
    if (patch.sector !== undefined) row.sector = patch.sector;
    if (patch.deptIndustry !== undefined) row.dept_industry = patch.deptIndustry;
    if (patch.contactPerson !== undefined) row.contact_person = patch.contactPerson;
    if (patch.phone !== undefined) row.phone = patch.phone;
    if (patch.email !== undefined) row.email = patch.email;
    if (patch.productCategory !== undefined) row.product_category = patch.productCategory;
    if (patch.model !== undefined) row.model = patch.model;
    if (patch.qty !== undefined) row.qty = Number(patch.qty);
    if (patch.estValue !== undefined) row.est_value = Number(patch.estValue);
    if (patch.source !== undefined) row.source = patch.source;
    if (patch.tenderRef !== undefined) row.tender_ref = patch.tenderRef;
    if (patch.stage !== undefined) row.stage = patch.stage;
    if (patch.expectedClose !== undefined) row.expected_close = patch.expectedClose;
    if (patch.nextFollowUp !== undefined) row.next_follow_up = patch.nextFollowUp;
    if (patch.salesPerson !== undefined) row.sales_person = patch.salesPerson;
    if (patch.remarks !== undefined) row.remarks = patch.remarks;
    if (patch.closedDate !== undefined) row.closed_date = patch.closedDate;

    const [updated] = await sql`
      UPDATE leads SET ${sql(row)} WHERE id = ${id} RETURNING *
    `;
    return mapRowToLead(updated);
  }

  const mem = getMemoryState();
  const idx = mem.leads.findIndex(l => l.id === id);
  if (idx !== -1) {
    mem.leads[idx] = { ...mem.leads[idx], ...patch };
    return mem.leads[idx];
  }
  return null;
}

export async function deleteLead(id) {
  const mode = getDbMode();

  if (mode === 'supabase') {
    const supabase = getSupabase();
    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  if (mode === 'postgres') {
    const sql = getSql();
    await sql`DELETE FROM leads WHERE id = ${id}`;
    return true;
  }

  const mem = getMemoryState();
  mem.leads = mem.leads.filter(l => l.id !== id);
  return true;
}

export async function saveAllLeads(leads) {
  const mode = getDbMode();

  if (mode === 'supabase') {
    const supabase = getSupabase();
    await supabase.from('leads').delete().neq('id', '');
    const rows = leads.map(mapLeadToRow);
    const { error } = await supabase.from('leads').insert(rows);
    if (error) throw error;
    return leads;
  }

  if (mode === 'postgres') {
    const sql = getSql();
    await sql`TRUNCATE TABLE leads`;
    const rows = leads.map(mapLeadToRow);
    if (rows.length > 0) {
      await sql`INSERT INTO leads ${sql(rows)}`;
    }
    return leads;
  }

  const mem = getMemoryState();
  mem.leads = leads;
  return leads;
}

export async function seedLeads(leadsList) {
  return saveAllLeads(leadsList);
}

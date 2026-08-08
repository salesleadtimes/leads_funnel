import { NextResponse } from 'next/server';
import { getLeads, updateLead, deleteLead } from '../../../../lib/services/leadsService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request, { params }) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Lead ID required' }, { status: 400 });
    }
    const leads = await getLeads();
    const lead = leads.find(l => l.id === id);
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }
    return NextResponse.json(lead);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch lead', detail: String(err) }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Lead ID required' }, { status: 400 });
    }
    const updated = await updateLead(id, body);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update lead', detail: String(err) }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Lead ID required' }, { status: 400 });
    }
    await deleteLead(id);
    return NextResponse.json({ success: true, id });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete lead', detail: String(err) }, { status: 500 });
  }
}

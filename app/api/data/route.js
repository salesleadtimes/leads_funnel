import { NextResponse } from 'next/server';
import { getLeads, saveAllLeads } from '../../../lib/services/leadsService';
import { getTargets, updateTargets } from '../../../lib/services/targetsService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
};

export async function GET() {
  try {
    const [leads, targets] = await Promise.all([getLeads(), getTargets()]);
    return NextResponse.json({ leads, targets }, { headers: NO_CACHE_HEADERS });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to retrieve sales data', detail: String(err) },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    if (!body || !Array.isArray(body.leads) || typeof body.targets !== 'object') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const [leads, targets] = await Promise.all([
      saveAllLeads(body.leads),
      updateTargets(body.targets)
    ]);

    return NextResponse.json({ leads, targets });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to save sales data', detail: String(err) }, { status: 500 });
  }
}

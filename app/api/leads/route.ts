import { NextResponse, type NextRequest } from 'next/server';
import { getLeads, createLead } from '../../../lib/services/leadsService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function GET() {
  try {
    const leads = await getLeads();
    return NextResponse.json(leads, { headers: NO_CACHE_HEADERS });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to fetch leads', detail: String(err) },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body || !body.orgName) {
      return NextResponse.json(
        { error: 'Missing required lead fields' },
        { status: 400 }
      );
    }
    const lead = await createLead(body);
    return NextResponse.json(lead, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to create lead', detail: String(err) },
      { status: 500 }
    );
  }
}

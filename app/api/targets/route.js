import { NextResponse } from 'next/server';
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
    const targets = await getTargets();
    return NextResponse.json(targets, { headers: NO_CACHE_HEADERS });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch targets', detail: String(err) }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid targets payload' }, { status: 400 });
    }
    const updated = await updateTargets(body);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update targets', detail: String(err) }, { status: 500 });
  }
}

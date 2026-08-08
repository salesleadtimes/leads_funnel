import { NextResponse } from 'next/server';
import { getState, saveState } from '../../../lib/kv';
import { seedState } from '../../../lib/seed';

export async function GET() {
  try {
    let state = await getState();
    if (!state) {
      state = seedState();
      await saveState(state);
    }
    return NextResponse.json(state);
  } catch (err) {
    return NextResponse.json(
      { error: 'Storage not connected yet. Add Vercel KV / Upstash Redis to this project (see README).', detail: String(err) },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    if (!body || !Array.isArray(body.leads) || typeof body.targets !== 'object') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
    const saved = await saveState(body);
    return NextResponse.json(saved);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to save', detail: String(err) }, { status: 500 });
  }
}

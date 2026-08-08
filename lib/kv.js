import { kv } from '@vercel/kv';

const STATE_KEY = 'hp-sales-funnel:state';

export async function getState() {
  const data = await kv.get(STATE_KEY);
  return data || null;
}

export async function saveState(state) {
  await kv.set(STATE_KEY, state);
  return state;
}

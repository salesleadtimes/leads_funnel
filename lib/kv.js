import { Redis as UpstashRedis } from '@upstash/redis';
import Redis from 'ioredis';

const STATE_KEY = 'hp-sales-funnel:state';

let redisClient = null;

function getClient() {
  if (redisClient) return redisClient;

  // 1. Check REST API variables (Vercel KV or Upstash REST)
  const restUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const restToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (restUrl && restToken) {
    redisClient = {
      type: 'upstash',
      client: new UpstashRedis({ url: restUrl, token: restToken })
    };
    return redisClient;
  }

  // 2. Check standard REDIS_URL (e.g., redis://default:...@...:6379)
  if (process.env.REDIS_URL) {
    redisClient = {
      type: 'ioredis',
      client: new Redis(process.env.REDIS_URL)
    };
    return redisClient;
  }

  // 3. Fallback try to Upstash fromEnv
  try {
    const fallbackClient = UpstashRedis.fromEnv();
    redisClient = { type: 'upstash', client: fallbackClient };
    return redisClient;
  } catch {
    return null;
  }
}

export async function getState() {
  const c = getClient();
  if (!c) {
    throw new Error('Redis credentials not found. Please set REDIS_URL, UPSTASH_REDIS_REST_URL & TOKEN, or KV_REST_API_URL & TOKEN in .env.local / Vercel.');
  }

  if (c.type === 'upstash') {
    const data = await c.client.get(STATE_KEY);
    return data || null;
  } else {
    const raw = await c.client.get(STATE_KEY);
    if (!raw) return null;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  }
}

export async function saveState(state) {
  const c = getClient();
  if (!c) {
    throw new Error('Redis credentials not found. Please set REDIS_URL, UPSTASH_REDIS_REST_URL & TOKEN, or KV_REST_API_URL & TOKEN in .env.local / Vercel.');
  }

  if (c.type === 'upstash') {
    await c.client.set(STATE_KEY, state);
    return state;
  } else {
    await c.client.set(STATE_KEY, JSON.stringify(state));
    return state;
  }
}

import Redis from 'ioredis';
import { env, isDev } from './env.js';

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    redis.on('connect', () => {
      console.log('✅ Redis connected');
    });

    redis.on('error', (error) => {
      console.error('❌ Redis error:', error);
    });
  }

  return redis;
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    console.log('Redis disconnected');
  }
}

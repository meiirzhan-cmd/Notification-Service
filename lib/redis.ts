import Redis from 'ioredis';

const getRedisUrl = (): string => {
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }

  const host = process.env.REDIS_HOST || 'localhost';
  const port = process.env.REDIS_PORT || '6379';
  const password = process.env.REDIS_PASSWORD;

  if (password) {
    return `redis://:${password}@${host}:${port}`;
  }

  return `redis://${host}:${port}`;
};

const createRedisClient = (): Redis => {
  const client = new Redis(getRedisUrl(), {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    reconnectOnError(err) {
      const targetError = 'READONLY';
      if (err.message.includes(targetError)) {
        return true;
      }
      return false;
    },
  });

  client.on('connect', () => {
    console.log('Redis client connected');
  });

  client.on('error', (err) => {
    console.error('Redis client error:', err);
  });

  client.on('reconnecting', () => {
    console.log('Redis client reconnecting...');
  });

  return client;
};

declare global {
  var redis: Redis | undefined;
}

// Singleton pattern to prevent multiple connections in development
const redis = globalThis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.redis = redis;
}

export default redis;

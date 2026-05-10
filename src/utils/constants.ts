import * as process from 'node:process';

export const MINIO_BUCKET_NAME = 'mosaic';

export const MINIO_FALLBACK_URL = 'https://storage.ourmosaic.space';

export const buildMinioUrl = (env: NodeJS.ProcessEnv = process.env): string => {
  const endpoint = env.MINIO_ENDPOINT?.trim();
  if (!endpoint) {
    return MINIO_FALLBACK_URL;
  }

  const useSSL = env.MINIO_USE_SSL?.toLowerCase() === 'true';
  const protocol = useSSL ? 'https' : 'http';
  const port = env.MINIO_PORT?.trim();
  const hasCustomPort = !!port && port !== '80' && port !== '443';

  return `${protocol}://${endpoint}${hasCustomPort ? `:${port}` : ''}`;
};

export const getMinioUrl = (): string => buildMinioUrl(process.env);

export const REDIS_EVENTS = {
  FRIENDSHIP_UPDATED: 'FRIENDSHIP_UPDATED',
  FRIENDSHIP_REQUEST_UPDATED: 'FRIENDSHIP_REQUEST_UPDATED',
  FRIENDSHIP_REMOVED: 'FRIENDSHIP_REMOVED',
  NEW_FRIEND_REQUEST: 'NEW_FRIEND_REQUEST',
  FRONT_SESSION_STARTED: 'FRONT_SESSION_STARTED',
  FRONT_SESSION_ENDED: 'FRONT_SESSION_ENDED',
  IMPORT_STARTED: 'IMPORT_STARTED',
  IMPORT_COMPLETED: 'IMPORT_COMPLETED',
  IMPORT_FAILED: 'IMPORT_FAILED',
};

export const SSE_TOPICS = {
  FRIENDSHIP: 'friendship',
  FRONT_SESSIONS: 'front-sessions',
  FEDERATION_FRONT_SESSIONS: 'federation-front-sessions',
  IMPORT: 'import',
};

export const SSE_KEEPALIVE_INTERVAL_MS = 5_000;

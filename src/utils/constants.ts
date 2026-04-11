import * as process from 'node:process';

export const MINIO_BUCKET_NAME = 'mosaic';

export const MINIO_URL = `${process.env.MINIO_USE_SSL ? 'https' : 'http'}://${process.env.MINIO_ENDPOINT}${process.env.MINIO_PORT != "443" && process.env.MINIO_PORT != "80" ? ":" + process.env.MINIO_PORT : ""}` || 'https://storage.ourmosaic.space';

export const REDIS_EVENTS = {
  FRIENDSHIP_UPDATED: 'FRIENDSHIP_UPDATED',
  FRIENDSHIP_REQUEST_UPDATED: 'FRIENDSHIP_REQUEST_UPDATED',
  FRIENDSHIP_REMOVED: 'FRIENDSHIP_REMOVED',
  NEW_FRIEND_REQUEST: 'NEW_FRIEND_REQUEST',
  FRONT_SESSION_STARTED: 'FRONT_SESSION_STARTED',
  FRONT_SESSION_ENDED: 'FRONT_SESSION_ENDED',
};

export const SSE_TOPICS = {
  FRIENDSHIP: 'friendship',
  FRONT_SESSIONS: 'front-sessions',
  FEDERATION_FRONT_SESSIONS: 'federation-front-sessions',
};

import { buildMinioUrl, MINIO_FALLBACK_URL } from './constants';

describe('buildMinioUrl', () => {
  it('returns fallback when endpoint is missing', () => {
    expect(buildMinioUrl({})).toBe(MINIO_FALLBACK_URL);
  });

  it('builds an https url without standard port 443', () => {
    expect(
      buildMinioUrl({
        MINIO_USE_SSL: 'true',
        MINIO_ENDPOINT: 'storage.ourmosaic.space',
        MINIO_PORT: '443',
      }),
    ).toBe('https://storage.ourmosaic.space');
  });

  it('builds an http url without standard port 80', () => {
    expect(
      buildMinioUrl({
        MINIO_USE_SSL: 'false',
        MINIO_ENDPOINT: 'localhost',
        MINIO_PORT: '80',
      }),
    ).toBe('http://localhost');
  });

  it('keeps custom ports', () => {
    expect(
      buildMinioUrl({
        MINIO_USE_SSL: 'true',
        MINIO_ENDPOINT: 'localhost',
        MINIO_PORT: '9000',
      }),
    ).toBe('https://localhost:9000');
  });
});

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../config.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(here, '../../uploads');

const safeName = (name) => name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100);

export function createStorage() {
  const provider = config.storage.provider.toLowerCase();
  if (provider === 's3' || provider === 'r2') {
    if (!config.storage.bucket || !config.storage.accessKeyId || !config.storage.secretAccessKey) {
      throw new Error('S3/R2 storage requires bucket and credentials.');
    }
    const client = new S3Client({
      region: config.storage.region,
      endpoint: config.storage.endpoint || undefined,
      credentials: { accessKeyId: config.storage.accessKeyId, secretAccessKey: config.storage.secretAccessKey },
      forcePathStyle: provider === 'r2'
    });
    return {
      provider,
      async upload({ key, buffer, mimeType }) {
        await client.send(new PutObjectCommand({ Bucket: config.storage.bucket, Key: key, Body: buffer, ContentType: mimeType }));
        return { key, url: null };
      }
    };
  }
  if (config.nodeEnv === 'production') throw new Error('Local file storage is only allowed for local development. Configure S3/R2.');
  return {
    provider: 'local',
    localDirectory: uploadsDir,
    async upload({ key, buffer }) {
      const absolute = path.join(uploadsDir, ...key.split('/'));
      await fs.mkdir(path.dirname(absolute), { recursive: true });
      await fs.writeFile(absolute, buffer);
      return { key, url: `/uploads/${key}` };
    },
    keyFor(originalName, hash) { return `works/${hash.slice(0, 12)}-${safeName(originalName)}`; }
  };
}

export const localUploadsDirectory = uploadsDir;
export const storageKeyFor = (originalName, hash) => `works/${hash.slice(0, 12)}-${safeName(originalName)}`;

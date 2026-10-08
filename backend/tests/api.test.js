import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import Jimp from 'jimp';
import { createApp } from '../src/app.js';
import { DemoRepository } from '../src/repositories/demo-repository.js';
import { sha256 } from '../src/services/hash.js';

const storage = { provider: 'test', keyFor: (name, hash) => `test/${hash}-${name}`, upload: async ({ key }) => ({ key, url: null }) };
const blockchain = { configured: false, anchor: async () => ({ status: 'UNAVAILABLE', error: 'Blockchain unavailable in test.' }) };

test('registers, authenticates, registers a work, and verifies its exact hash', async () => {
  const app = createApp({ repository: new DemoRepository(), storage, blockchain, demoMode: true });
  const email = `student-${Date.now()}@college.test`;
  const registration = await request(app).post('/api/auth/register').send({ name: 'Student Creator', email, password: 'SecurePass123!' }).expect(201);
  assert.equal(registration.body.user.role, 'USER');
  const login = await request(app).post('/api/auth/login').send({ email, password: 'SecurePass123!' }).expect(200);
  const file = Buffer.from('unique evidence content');
  const work = await request(app).post('/api/ip/register').set('Authorization', `Bearer ${login.body.token}`)
    .field('title', 'Evidence Notes').field('category', 'DOCUMENT').field('license', 'CC BY 4.0').attach('file', file, { filename: 'evidence.txt', contentType: 'text/plain' }).expect(201);
  assert.match(work.body.registration.ipId, /^CP-\d{4}-\d{6}$/);
  assert.equal(work.body.hash, sha256(file));
  const versionTwo = await request(app).post('/api/ip/register').set('Authorization', `Bearer ${login.body.token}`)
    .field('title', 'Evidence Notes Revised').field('category', 'DOCUMENT').field('license', 'CC BY 4.0').field('previousIpId', work.body.registration.ipId)
    .attach('file', Buffer.from('unique evidence content revised'), { filename: 'evidence-v2.txt', contentType: 'text/plain' }).expect(201);
  assert.equal(versionTwo.body.registration.version, 2);
  const history = await request(app).get(`/api/ip/${work.body.registration.ipId}/versions`).expect(200);
  assert.equal(history.body.versions.length, 2);
  const exact = await request(app).post('/api/verify/exact').attach('file', file, { filename: 'evidence.txt', contentType: 'text/plain' }).expect(200);
  assert.equal(exact.body.exactMatch, true);
  const mismatch = await request(app).post('/api/verify/exact').attach('file', Buffer.from('changed'), { filename: 'changed.txt', contentType: 'text/plain' }).expect(200);
  assert.equal(mismatch.body.exactMatch, false);
});

test('enforces administrator access', async () => {
  const app = createApp({ repository: new DemoRepository(), storage, blockchain, demoMode: true });
  const user = await request(app).post('/api/auth/register').send({ name: 'Normal User', email: `normal-${Date.now()}@college.test`, password: 'SecurePass123!' });
  await request(app).get('/api/admin/stats').set('Authorization', `Bearer ${user.body.token}`).expect(403);
  const admin = await request(app).post('/api/auth/login').send({ email: 'demo@chainproof.local', password: 'Demo123!' });
  const stats = await request(app).get('/api/admin/stats').set('Authorization', `Bearer ${admin.body.token}`).expect(200);
  assert.ok(stats.body.stats.registrations >= 4);
});

test('creates and searches a logo fingerprint only for a logo registration', async () => {
  const app = createApp({ repository: new DemoRepository(), storage, blockchain, demoMode: true });
  const email = `logo-${Date.now()}@college.test`;
  const account = await request(app).post('/api/auth/register').send({ name: 'Logo Creator', email, password: 'SecurePass123!' });
  const image = new Jimp(64, 64, 0xffffffff);
  image.scan(12, 12, 40, 40, (x, y, index) => { image.bitmap.data[index] = 22; image.bitmap.data[index + 1] = 71; image.bitmap.data[index + 2] = 39; });
  const logo = await image.getBufferAsync(Jimp.MIME_PNG);
  await request(app).post('/api/ip/register').set('Authorization', `Bearer ${account.body.token}`)
    .field('title', 'Test Green Square').field('category', 'LOGO').field('license', 'All rights reserved')
    .attach('file', logo, { filename: 'test-logo.png', contentType: 'image/png' }).expect(201);
  const searched = await request(app).post('/api/logos/search').attach('file', logo, { filename: 'photo.png', contentType: 'image/png' }).expect(200);
  assert.ok(searched.body.results.some((result) => result.registration.title === 'Test Green Square' && result.similarity === 100));
});

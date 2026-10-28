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
  const history = await request(app).get(`/api/ip/${work.body.registration.ipId}/versions`).set('Authorization', `Bearer ${login.body.token}`).expect(200);
  assert.equal(history.body.versions.length, 2);
  const exact = await request(app).post('/api/verify/exact').attach('file', file, { filename: 'evidence.txt', contentType: 'text/plain' }).expect(200);
  assert.equal(exact.body.exactMatch, true);
  assert.equal(exact.body.registration.storageUrl, undefined);
  const mismatch = await request(app).post('/api/verify/exact').attach('file', Buffer.from('changed'), { filename: 'changed.txt', contentType: 'text/plain' }).expect(200);
  assert.equal(mismatch.body.exactMatch, false);
  assert.equal(mismatch.body.registration, null);
});

test('exposes a storage-safe public registration and verifies only its supplied SHA-256', async () => {
  const repository = new DemoRepository();
  const app = createApp({ repository, storage, blockchain, demoMode: true });
  const ipId = 'CP-2026-000001';

  const publicRecord = await request(app).get(`/api/public/registrations/${ipId}`).expect(200);
  assert.equal(publicRecord.body.registration.ipId, ipId);
  assert.equal(publicRecord.body.registration.storageKey, undefined);
  assert.equal(publicRecord.body.registration.storageUrl, undefined);
  assert.equal(publicRecord.body.registration.description, undefined);
  assert.equal(publicRecord.body.registration.creatorId, undefined);

  const matching = await request(app)
    .post(`/api/public/registrations/${ipId}/verify`)
    .send({ sha256: 'a'.repeat(64) })
    .expect(200);
  assert.equal(matching.body.exactMatch, true);
  assert.equal(matching.body.ipId, ipId);

  const mismatch = await request(app)
    .post(`/api/public/registrations/${ipId}/verify`)
    .send({ sha256: 'b'.repeat(64) })
    .expect(200);
  assert.equal(mismatch.body.exactMatch, false);
  assert.equal(repository.verifications.length, 0, 'public hash-only comparison does not persist a verification file or record');

  const versions = await request(app).get(`/api/public/registrations/${ipId}/versions`).expect(200);
  assert.equal(versions.body.versions.length, 1);
  assert.equal(versions.body.versions[0].storageKey, undefined);

  await request(app).post(`/api/public/registrations/${ipId}/verify`).send({ sha256: 'invalid' }).expect(400);
});

test('keeps original files and private registration detail restricted to their creator', async () => {
  const app = createApp({ repository: new DemoRepository(), storage, blockchain, demoMode: true });
  const owner = await request(app).post('/api/auth/register').send({ name: 'Record Owner', email: `owner-${Date.now()}@college.test`, password: 'SecurePass123!' });
  const file = Buffer.from('private evidence bytes');
  const work = await request(app).post('/api/ip/register').set('Authorization', `Bearer ${owner.body.token}`)
    .field('title', 'Private File').field('category', 'DOCUMENT').field('license', 'All rights reserved')
    .attach('file', file, { filename: 'private.txt', contentType: 'text/plain' }).expect(201);
  const other = await request(app).post('/api/auth/register').send({ name: 'Other Creator', email: `other-${Date.now()}@college.test`, password: 'SecurePass123!' });

  await request(app).get(`/api/ip/${work.body.registration.ipId}`).expect(401);
  await request(app).get(`/api/ip/${work.body.registration.ipId}`).set('Authorization', `Bearer ${other.body.token}`).expect(403);
  const ownRecord = await request(app).get(`/api/ip/${work.body.registration.ipId}`).set('Authorization', `Bearer ${owner.body.token}`).expect(200);
  assert.equal(ownRecord.body.registration.storageKey.startsWith('test/'), true);
});

test('runs the professor demo flow from logo registration through public QR verification and sign-in again', async () => {
  const app = createApp({ repository: new DemoRepository(), storage, blockchain, demoMode: true });
  const email = `professor-demo-${Date.now()}@college.test`;
  const account = await request(app).post('/api/auth/register')
    .send({ name: 'Professor Demo Creator', email, password: 'SecurePass123!' }).expect(201);

  const logoImage = new Jimp(64, 64, 0xffffffff);
  logoImage.scan(10, 10, 44, 44, (_x, _y, index) => {
    logoImage.bitmap.data[index] = 18;
    logoImage.bitmap.data[index + 1] = 92;
    logoImage.bitmap.data[index + 2] = 48;
  });
  const logo = await logoImage.getBufferAsync(Jimp.MIME_PNG);
  const first = await request(app).post('/api/ip/register').set('Authorization', `Bearer ${account.body.token}`)
    .field('title', 'Professor Demo Campus Mark').field('category', 'LOGO').field('license', 'All rights reserved')
    .attach('file', logo, { filename: 'campus-mark.png', contentType: 'image/png' }).expect(201);
  const firstId = first.body.registration.ipId;
  assert.equal(first.body.registration.category, 'LOGO');
  assert.equal(first.body.hash, sha256(logo));

  const publicRecord = await request(app).get(`/api/public/registrations/${firstId}`).expect(200);
  assert.equal(publicRecord.body.registration.sha256, sha256(logo));
  assert.equal(publicRecord.body.registration.storageUrl, undefined);
  assert.equal(publicRecord.body.registration.storageKey, undefined);

  const exact = await request(app).post(`/api/public/registrations/${firstId}/verify`).send({ sha256: sha256(logo) }).expect(200);
  const changed = await request(app).post(`/api/public/registrations/${firstId}/verify`).send({ sha256: sha256(Buffer.concat([logo, Buffer.from([0])])) }).expect(200);
  assert.equal(exact.body.exactMatch, true);
  assert.equal(changed.body.exactMatch, false);

  const visual = await request(app).post('/api/logos/search').attach('file', logo, { filename: 'campus-photo.png', contentType: 'image/png' }).expect(200);
  const logoMatch = visual.body.results.find((result) => result.registration.ipId === firstId);
  assert.equal(logoMatch.similarity, 100);
  assert.equal(logoMatch.registration.storageUrl, undefined);

  const revisedLogo = await new Jimp(64, 64, 0xffeeeeee).getBufferAsync(Jimp.MIME_PNG);
  const second = await request(app).post('/api/ip/register').set('Authorization', `Bearer ${account.body.token}`)
    .field('title', 'Professor Demo Campus Mark Revised').field('category', 'LOGO').field('license', 'All rights reserved').field('previousIpId', firstId)
    .attach('file', revisedLogo, { filename: 'campus-mark-v2.png', contentType: 'image/png' }).expect(201);
  assert.equal(second.body.registration.version, 2);

  const versions = await request(app).get(`/api/public/registrations/${firstId}/versions`).expect(200);
  assert.deepEqual(versions.body.versions.map((record) => record.ipId), [firstId, second.body.registration.ipId]);
  const registry = await request(app).get('/api/registry').expect(200);
  assert.ok(registry.body.registrations.some((record) => record.ipId === firstId));
  assert.equal(registry.body.registrations.find((record) => record.ipId === firstId).storageUrl, undefined);

  const mineBeforeSignOut = await request(app).get('/api/ip').set('Authorization', `Bearer ${account.body.token}`).expect(200);
  assert.equal(mineBeforeSignOut.body.registrations.length, 2);
  await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${account.body.token}`).expect(204);
  const signedInAgain = await request(app).post('/api/auth/login').send({ email, password: 'SecurePass123!' }).expect(200);
  const mineAfterSignIn = await request(app).get('/api/ip').set('Authorization', `Bearer ${signedInAgain.body.token}`).expect(200);
  assert.equal(mineAfterSignIn.body.registrations.length, 2);
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

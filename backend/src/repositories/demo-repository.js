import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

const clone = (value) => structuredClone(value);
const now = () => new Date().toISOString();
const demoPassword = bcrypt.hashSync('Demo123!', 10);

export class DemoRepository {
  constructor() {
    this.users = [{ id: 'demo-admin', name: 'Demo Administrator', email: 'demo@chainproof.local', passwordHash: demoPassword, role: 'ADMIN', createdAt: now(), updatedAt: now() }];
    this.registrations = [
      { id: 'seed-logo', ipId: 'CP-2026-000001', rootIpId: 'CP-2026-000001', title: 'Aurora Studio Mark', description: 'Example logo used to demonstrate ChainProof.', category: 'LOGO', creatorName: 'ChainProof Studio', creatorId: 'demo-admin', sha256: 'a'.repeat(64), storageKey: 'seed/aurora-logo.png', storageUrl: null, mimeType: 'image/png', fileSize: 12048, license: 'All rights reserved', tags: ['logo', 'demo', 'brand'], version: 1, previousIpId: null, createdAt: '2026-10-07T08:00:00.000Z', updatedAt: '2026-10-07T08:00:00.000Z', blockchainTxHash: null, blockchainStatus: 'UNAVAILABLE', contractAddress: null, blockchainError: 'Demo mode — not anchored to a blockchain.', logoFingerprint: { fingerprint: '1010'.repeat(64) } },
      { id: 'seed-art', ipId: 'CP-2026-000002', rootIpId: 'CP-2026-000002', title: 'City at Dusk', description: 'Example digital artwork.', category: 'ARTWORK', creatorName: 'ChainProof Studio', creatorId: 'demo-admin', sha256: 'b'.repeat(64), storageKey: 'seed/city-art.png', storageUrl: null, mimeType: 'image/png', fileSize: 36012, license: 'CC BY-NC 4.0', tags: ['artwork', 'demo'], version: 1, previousIpId: null, createdAt: '2026-10-06T08:00:00.000Z', updatedAt: '2026-10-06T08:00:00.000Z', blockchainTxHash: null, blockchainStatus: 'UNAVAILABLE', contractAddress: null, blockchainError: 'Demo mode — not anchored to a blockchain.' },
      { id: 'seed-research', ipId: 'CP-2026-000003', rootIpId: 'CP-2026-000003', title: 'Sustainable Computing Research', description: 'Example research document.', category: 'RESEARCH', creatorName: 'ChainProof Studio', creatorId: 'demo-admin', sha256: 'c'.repeat(64), storageKey: 'seed/research.pdf', storageUrl: null, mimeType: 'application/pdf', fileSize: 84322, license: 'CC BY 4.0', tags: ['research', 'demo'], version: 1, previousIpId: null, createdAt: '2026-10-05T08:00:00.000Z', updatedAt: '2026-10-05T08:00:00.000Z', blockchainTxHash: null, blockchainStatus: 'UNAVAILABLE', contractAddress: null, blockchainError: 'Demo mode — not anchored to a blockchain.' },
      { id: 'seed-software', ipId: 'CP-2026-000004', rootIpId: 'CP-2026-000004', title: 'Campus Scheduler', description: 'Example software project.', category: 'SOFTWARE', creatorName: 'ChainProof Studio', creatorId: 'demo-admin', sha256: 'd'.repeat(64), storageKey: 'seed/scheduler.zip', storageUrl: null, mimeType: 'application/zip', fileSize: 183422, license: 'MIT', tags: ['software', 'demo'], version: 1, previousIpId: null, createdAt: '2026-10-04T08:00:00.000Z', updatedAt: '2026-10-04T08:00:00.000Z', blockchainTxHash: null, blockchainStatus: 'UNAVAILABLE', contractAddress: null, blockchainError: 'Demo mode — not anchored to a blockchain.' }
    ];
    this.verifications = [];
  }
  async findUserByEmail(email) { return clone(this.users.find((user) => user.email === email.toLowerCase()) || null); }
  async findUser(id) { return clone(this.users.find((user) => user.id === id) || null); }
  async createUser(data) { const user = { id: crypto.randomUUID(), ...data, email: data.email.toLowerCase(), role: 'USER', createdAt: now(), updatedAt: now() }; this.users.push(user); return clone(user); }
  async listRegistrations(filters = {}) {
    let records = this.registrations;
    if (filters.q) { const q = filters.q.toLowerCase(); records = records.filter((r) => [r.ipId, r.title, r.creatorName, r.category, ...r.tags].join(' ').toLowerCase().includes(q)); }
    if (filters.category) records = records.filter((r) => r.category === filters.category);
    if (filters.status) records = records.filter((r) => r.blockchainStatus === filters.status);
    if (filters.creator) records = records.filter((r) => r.creatorName.toLowerCase().includes(filters.creator.toLowerCase()));
    return clone(records.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }
  async findRegistration(ipId) { return clone(this.registrations.find((record) => record.ipId === ipId) || null); }
  async findByHash(hash) { return clone(this.registrations.find((record) => record.sha256 === hash) || null); }
  async createRegistration(data) {
    const number = this.registrations.length + 1;
    const ipId = `CP-${new Date().getFullYear()}-${String(number).padStart(6, '0')}`;
    const previous = data.previousIpId ? this.registrations.find((item) => item.ipId === data.previousIpId) : null;
    const record = { id: crypto.randomUUID(), ipId, rootIpId: previous?.rootIpId || ipId, ...data, logoFingerprint: data.logoFingerprint ? { fingerprint: data.logoFingerprint } : undefined, version: previous ? previous.version + 1 : 1, createdAt: now(), updatedAt: now(), blockchainStatus: 'UNAVAILABLE', blockchainTxHash: null, contractAddress: null, blockchainError: null };
    this.registrations.push(record); return clone(record);
  }
  async updateBlockchain(ipId, result) { const record = this.registrations.find((item) => item.ipId === ipId); Object.assign(record, { blockchainStatus: result.status, blockchainTxHash: result.txHash || null, contractAddress: result.contractAddress || null, blockchainError: result.error || null, updatedAt: now() }); return clone(record); }
  async createVerification(data) { this.verifications.push({ id: crypto.randomUUID(), ...data, createdAt: now() }); }
  async logoRecords() { return clone(this.registrations.filter((item) => item.category === 'LOGO' && item.logoFingerprint)); }
  async versions(ipId) { const current = this.registrations.find((item) => item.ipId === ipId); return clone(current ? this.registrations.filter((item) => item.rootIpId === current.rootIpId).sort((a, b) => a.version - b.version) : []); }
  async userRegistrations(userId) { return clone(this.registrations.filter((item) => item.creatorId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))); }
  async stats() { return { users: this.users.length, registrations: this.registrations.length, logos: this.registrations.filter((r) => r.category === 'LOGO').length, verifications: this.verifications.length, blockchainConfirmed: this.registrations.filter((r) => r.blockchainStatus === 'CONFIRMED').length, pending: this.registrations.filter((r) => r.blockchainStatus === 'PENDING').length }; }
  async allUsers() { return clone(this.users.map(({ passwordHash, ...user }) => user)); }
}

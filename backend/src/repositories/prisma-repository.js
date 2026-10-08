import { PrismaClient } from '@prisma/client';

const publicUser = ({ passwordHash, ...user }) => user;
const includeRegistration = { logoFingerprint: true, creator: { select: { id: true, name: true, email: true } } };

export class PrismaRepository {
  constructor() { this.prisma = new PrismaClient(); }
  async disconnect() { await this.prisma.$disconnect(); }
  async findUserByEmail(email) { return this.prisma.user.findUnique({ where: { email: email.toLowerCase() } }); }
  async findUser(id) { return this.prisma.user.findUnique({ where: { id } }); }
  async createUser(data) { return this.prisma.user.create({ data: { ...data, email: data.email.toLowerCase() } }); }
  async listRegistrations(filters = {}) {
    const where = {
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.status ? { blockchainStatus: filters.status } : {}),
      ...(filters.creator ? { creatorName: { contains: filters.creator, mode: 'insensitive' } } : {}),
      ...(filters.q ? { OR: [
        { ipId: { contains: filters.q, mode: 'insensitive' } }, { title: { contains: filters.q, mode: 'insensitive' } },
        { creatorName: { contains: filters.q, mode: 'insensitive' } }, { tags: { has: filters.q } }
      ] } : {})
    };
    return this.prisma.iPRegistration.findMany({ where, include: includeRegistration, orderBy: { createdAt: 'desc' } });
  }
  async findRegistration(ipId) { return this.prisma.iPRegistration.findUnique({ where: { ipId }, include: { ...includeRegistration, transactions: { orderBy: { createdAt: 'desc' } } } }); }
  async findByHash(sha256) { return this.prisma.iPRegistration.findUnique({ where: { sha256 }, include: includeRegistration }); }
  async createRegistration(data) {
    return this.prisma.$transaction(async (tx) => {
      await tx.registryCounter.upsert({ where: { id: 1 }, create: { id: 1, value: 0 }, update: {} });
      const counter = await tx.registryCounter.update({ where: { id: 1 }, data: { value: { increment: 1 } } });
      const ipId = `CP-${new Date().getUTCFullYear()}-${String(counter.value).padStart(6, '0')}`;
      const previous = data.previousIpId ? await tx.iPRegistration.findUnique({ where: { ipId: data.previousIpId } }) : null;
      if (data.previousIpId && !previous) throw new Error('Previous IP ID was not found.');
      const rootIpId = previous?.rootIpId || ipId;
      const version = previous ? previous.version + 1 : 1;
      return tx.iPRegistration.create({
        data: {
          ...data, ipId, rootIpId, version,
          logoFingerprint: data.logoFingerprint ? { create: { fingerprint: data.logoFingerprint } } : undefined,
          versions: { create: { rootIpId, ipId, version, previousIpId: data.previousIpId || null, sha256: data.sha256 } }
        }, include: includeRegistration
      });
    });
  }
  async updateBlockchain(ipId, result) {
    return this.prisma.iPRegistration.update({
      where: { ipId },
      data: {
        blockchainStatus: result.status, blockchainTxHash: result.txHash || null, contractAddress: result.contractAddress || null,
        blockchainError: result.error || null,
        transactions: { create: { status: result.status, txHash: result.txHash || null, contractAddress: result.contractAddress || null, network: result.network || null, error: result.error || null, confirmedAt: result.status === 'CONFIRMED' ? new Date() : null } }
      }, include: includeRegistration
    });
  }
  async createVerification(data) { return this.prisma.verificationRecord.create({ data }); }
  async logoRecords() { return this.prisma.iPRegistration.findMany({ where: { category: 'LOGO' }, include: includeRegistration }); }
  async versions(ipId) { const current = await this.prisma.iPRegistration.findUnique({ where: { ipId } }); if (!current) return []; return this.prisma.iPRegistration.findMany({ where: { rootIpId: current.rootIpId }, include: includeRegistration, orderBy: { version: 'asc' } }); }
  async userRegistrations(userId) { return this.prisma.iPRegistration.findMany({ where: { creatorId: userId }, include: includeRegistration, orderBy: { createdAt: 'desc' } }); }
  async stats() {
    const [users, registrations, logos, verifications, blockchainConfirmed, pending] = await Promise.all([
      this.prisma.user.count(), this.prisma.iPRegistration.count(), this.prisma.iPRegistration.count({ where: { category: 'LOGO' } }),
      this.prisma.verificationRecord.count(), this.prisma.iPRegistration.count({ where: { blockchainStatus: 'CONFIRMED' } }), this.prisma.iPRegistration.count({ where: { blockchainStatus: 'PENDING' } })
    ]);
    return { users, registrations, logos, verifications, blockchainConfirmed, pending };
  }
  async allUsers() { const users = await this.prisma.user.findMany({ orderBy: { createdAt: 'desc' } }); return users.map(publicUser); }
}

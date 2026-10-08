import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const records = [
  ['CP-2026-000001', 'Aurora Studio Mark', 'LOGO', 'A sample logo for visual-search demonstrations.', 'a'.repeat(64), 'image/png', 12048, 'All rights reserved', ['logo', 'demo', 'brand']],
  ['CP-2026-000002', 'City at Dusk', 'ARTWORK', 'A sample digital artwork.', 'b'.repeat(64), 'image/png', 36012, 'CC BY-NC 4.0', ['artwork', 'demo']],
  ['CP-2026-000003', 'Sustainable Computing Research', 'RESEARCH', 'A sample research document.', 'c'.repeat(64), 'application/pdf', 84322, 'CC BY 4.0', ['research', 'demo']],
  ['CP-2026-000004', 'Campus Scheduler', 'SOFTWARE', 'A sample software project.', 'd'.repeat(64), 'application/zip', 183422, 'MIT', ['software', 'demo']]
];

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: 'demo@chainproof.local' },
    update: {},
    create: { name: 'Demo Administrator', email: 'demo@chainproof.local', passwordHash: await bcrypt.hash('Demo123!', 12), role: 'ADMIN' }
  });
  for (let index = 0; index < records.length; index += 1) {
    const [ipId, title, category, description, sha256, mimeType, fileSize, license, tags] = records[index];
    await prisma.iPRegistration.upsert({
      where: { ipId }, update: {},
      create: {
        ipId, rootIpId: ipId, title, category, description, creatorName: 'ChainProof Studio', creatorId: admin.id,
        sha256, storageKey: `seed/${ipId}`, mimeType, fileSize, license, tags, version: 1,
        blockchainStatus: 'UNAVAILABLE',
        logoFingerprint: category === 'LOGO' ? { create: { fingerprint: '1010'.repeat(64) } } : undefined,
        versions: { create: { rootIpId: ipId, ipId, version: 1, sha256 } }
      }
    });
  }
  await prisma.registryCounter.upsert({ where: { id: 1 }, update: { value: 4 }, create: { id: 1, value: 4 } });
  console.log('Seeded ChainProof demo records.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());

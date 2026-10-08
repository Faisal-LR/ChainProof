const { expect } = require('chai');

describe('ChainProofRegistry', function () {
  it('records and returns an evidence record', async function () {
    const [creator] = await ethers.getSigners();
    const Registry = await ethers.getContractFactory('ChainProofRegistry');
    const registry = await Registry.deploy();
    const hash = ethers.keccak256(ethers.toUtf8Bytes('chainproof demo'));
    await expect(registry.registerIP('CP-2026-000001', hash, 'LOGO', 'All rights reserved', 1, ''))
      .to.emit(registry, 'IPRegistered');
    const record = await registry.getProof('CP-2026-000001');
    expect(record.contentHash).to.equal(hash);
    expect(record.creator).to.equal(creator.address);
    expect(record.version).to.equal(1n);
  });
});

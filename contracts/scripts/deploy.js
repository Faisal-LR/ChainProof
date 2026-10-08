async function main() {
  const Registry = await ethers.getContractFactory('ChainProofRegistry');
  const registry = await Registry.deploy();
  await registry.waitForDeployment();
  console.log(`ChainProofRegistry deployed to ${await registry.getAddress()}`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });

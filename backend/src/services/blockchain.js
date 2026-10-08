import { Contract, JsonRpcProvider, Wallet } from 'ethers';
import { config } from '../config.js';
import { bytes32 } from './hash.js';

const abi = [
  'function registerIP(string ipId, bytes32 contentHash, string category, string licenseName, uint32 version, string previousIpId)',
  'function getProof(string ipId) view returns ((bytes32 contentHash,address creator,uint64 registeredAt,string category,string licenseName,uint32 version,string previousIpId,bool exists))'
];

export function createBlockchain() {
  const settings = config.blockchain;
  const configured = Boolean(settings.rpcUrl && settings.privateKey && settings.contractAddress);
  return {
    configured,
    contractAddress: settings.contractAddress || null,
    async anchor(registration) {
      if (!configured) return { status: 'UNAVAILABLE', error: 'Blockchain unavailable: RPC_URL, PRIVATE_KEY, or CONTRACT_ADDRESS is not configured.' };
      try {
        const provider = new JsonRpcProvider(settings.rpcUrl, settings.chainId);
        const signer = new Wallet(settings.privateKey, provider);
        const contract = new Contract(settings.contractAddress, abi, signer);
        const transaction = await contract.registerIP(
          registration.ipId, bytes32(registration.sha256), registration.category, registration.license,
          registration.version, registration.previousIpId || ''
        );
        const receipt = await transaction.wait();
        if (!receipt || receipt.status !== 1) return { status: 'FAILED', txHash: transaction.hash, error: 'Blockchain transaction was not confirmed.' };
        return { status: 'CONFIRMED', txHash: transaction.hash, contractAddress: settings.contractAddress, network: String(settings.chainId || 'configured') };
      } catch (error) {
        return { status: 'FAILED', error: error.shortMessage || 'Blockchain transaction failed.' };
      }
    },
    async getProof(ipId) {
      if (!configured) return { status: 'UNAVAILABLE', error: 'Blockchain unavailable: RPC_URL, PRIVATE_KEY, or CONTRACT_ADDRESS is not configured.' };
      try {
        const provider = new JsonRpcProvider(settings.rpcUrl, settings.chainId);
        const contract = new Contract(settings.contractAddress, abi, provider);
        const proof = await contract.getProof(ipId);
        return {
          status: 'CONFIRMED',
          proof: {
            contentHash: proof.contentHash,
            creator: proof.creator,
            registeredAt: Number(proof.registeredAt),
            category: proof.category,
            license: proof.licenseName,
            version: Number(proof.version),
            previousIpId: proof.previousIpId,
            exists: proof.exists
          }
        };
      } catch (error) {
        return { status: 'FAILED', error: error.shortMessage || 'Blockchain proof lookup failed.' };
      }
    }
  };
}

import { createApp } from './app.js';
import { config } from './config.js';
import { createRepository } from './repositories/index.js';
import { createStorage, localUploadsDirectory } from './services/storage.js';
import { createBlockchain } from './services/blockchain.js';

const repository = createRepository();
const storage = createStorage();
const blockchain = createBlockchain();
const app = createApp({ repository, storage, blockchain, localUploadsDirectory: storage.provider === 'local' ? localUploadsDirectory : undefined });

const server = app.listen(config.port, () => {
  console.log(`ChainProof API listening on http://localhost:${config.port} (${config.demoMode ? 'DEMO MODE' : 'production database'})`);
  if (!blockchain.configured) console.log('Blockchain unavailable — configure RPC_URL, PRIVATE_KEY, and CONTRACT_ADDRESS to anchor proof.');
});
const shutdown = async () => { server.close(); await repository.disconnect?.(); };
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);

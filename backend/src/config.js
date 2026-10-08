import 'dotenv/config';

const asBool = (value) => String(value).toLowerCase() === 'true';
const port = Number(process.env.PORT || 4000);
const maxMb = Number(process.env.MAX_FILE_SIZE_MB || 15);
const requestedDemoMode = asBool(process.env.DEMO_MODE);
const nodeEnv = process.env.NODE_ENV || 'development';

if (nodeEnv === 'production' && (requestedDemoMode || !process.env.DATABASE_URL)) {
  throw new Error('Production requires DATABASE_URL and DEMO_MODE=false.');
}

export const config = {
  port,
  nodeEnv,
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'chainproof-demo-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173',
  demoMode: requestedDemoMode || !process.env.DATABASE_URL,
  maxFileBytes: maxMb * 1024 * 1024,
  maxFileMb: maxMb,
  visualThreshold: Math.min(100, Math.max(0, Number(process.env.VISUAL_SIMILARITY_THRESHOLD || 65))),
  storage: {
    provider: process.env.STORAGE_PROVIDER || 'local', endpoint: process.env.STORAGE_ENDPOINT,
    region: process.env.STORAGE_REGION || 'auto', bucket: process.env.STORAGE_BUCKET,
    accessKeyId: process.env.STORAGE_ACCESS_KEY, secretAccessKey: process.env.STORAGE_SECRET_KEY
  },
  blockchain: {
    rpcUrl: process.env.RPC_URL, chainId: process.env.CHAIN_ID ? Number(process.env.CHAIN_ID) : undefined,
    privateKey: process.env.PRIVATE_KEY, contractAddress: process.env.CONTRACT_ADDRESS
  }
};

if (config.nodeEnv === 'production' && config.jwtSecret.startsWith('chainproof-demo')) {
  throw new Error('JWT_SECRET must be configured in production.');
}

import crypto from 'node:crypto';

export const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
export const bytes32 = (hex) => `0x${hex}`;

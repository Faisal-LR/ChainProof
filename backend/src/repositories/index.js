import { config } from '../config.js';
import { DemoRepository } from './demo-repository.js';
import { PrismaRepository } from './prisma-repository.js';

export const createRepository = () => config.demoMode ? new DemoRepository() : new PrismaRepository();

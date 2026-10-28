
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { config } from './config.js';
import { sha256 } from './services/hash.js';
import { logoFingerprint, similarity } from './services/visual.js';
import { issueToken, requireAdmin, requireAuth } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/errors.js';

const categories = [
  'LOGO', 'ARTWORK', 'SOFTWARE', 'ALGORITHM', 'PHOTOGRAPHY',
  'RESEARCH', 'DOCUMENT', 'MUSIC', 'DESIGN', 'WRITING', 'OTHER'
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxFileBytes, files: 1 }
});

const asyncRoute = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const publicUser = ({ passwordHash, ...user }) => user;

const publicRegistration = (record) => record && ({
  ...record,
  creator: record.creator
    ? { id: record.creator.id, name: record.creator.name }
    : undefined
});

const tagsFrom = (value) =>
  Array.isArray(value)
    ? value.map(String).map((tag) => tag.trim()).filter(Boolean).slice(0, 12)
    : String(value || '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 12);

const registrationId = z.string().regex(/^CP-\d{4}-\d{6}$/, 'Invalid registration ID.');
const sha256Value = z.string().trim().regex(/^[a-fA-F0-9]{64}$/, 'Invalid SHA-256 hash.');

const explorerByNetwork = {
  '1': 'https://etherscan.io',
  '11155111': 'https://sepolia.etherscan.io',
  '137': 'https://polygonscan.com',
  '80002': 'https://amoy.polygonscan.com',
  '8453': 'https://basescan.org',
  '84532': 'https://sepolia.basescan.org'
};

const networkNames = {
  '1': 'Ethereum Mainnet',
  '11155111': 'Ethereum Sepolia',
  '137': 'Polygon',
  '80002': 'Polygon Amoy',
  '8453': 'Base',
  '84532': 'Base Sepolia',
  '31337': 'Hardhat local network'
};

function publicRegistrationRecord(record) {
  if (!record) return null;
  const transaction = record.transactions?.[0] || null;
  const transactionHash = record.blockchainTxHash || transaction?.txHash || null;
  const network = transaction?.network || (record.blockchainStatus === 'CONFIRMED' && config.blockchain.chainId ? String(config.blockchain.chainId) : null);
  const explorerBase = config.blockchain.blockExplorerUrl || (network ? explorerByNetwork[network] : null);

  return {
    ipId: record.ipId,
    title: record.title,
    creatorName: record.creatorName,
    category: record.category,
    sha256: record.sha256,
    license: record.license,
    version: record.version,
    previousIpId: record.previousIpId,
    createdAt: record.createdAt,
    mimeType: record.mimeType,
    fileSize: record.fileSize,
    blockchainStatus: record.blockchainStatus,
    blockchainTxHash: transactionHash,
    contractAddress: record.contractAddress || transaction?.contractAddress || null,
    blockchainNetwork: network ? { id: network, name: networkNames[network] || `Network ${network}` } : null,
    transactionUrl: transactionHash && explorerBase
      ? `${explorerBase.replace(/\/$/, '')}/tx/${transactionHash}`
      : null
  };
}

function assertRecordAccess(record, user) {
  if (record.creatorId !== user.id && user.role !== 'ADMIN') {
    const error = new Error('You are not allowed to view this private registration.');
    error.status = 403;
    throw error;
  }
}

const optionalAuth = (repository) => async (req, res, next) => {
  const token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null;

  if (!token) return next();

  try {
    const { default: jwt } = await import('jsonwebtoken');
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = await repository.findUser(payload.sub);
  } catch {
    // Verification remains public.
  }

  return next();
};

function validateFile(file, imageOnly = false) {
  if (!file) throw new Error('Please choose a file to upload.');

  if (
    !file.mimetype ||
    file.mimetype === 'application/x-msdownload' ||
    file.mimetype === 'application/x-dosexec'
  ) {
    throw new Error('This file type is not allowed.');
  }

  if (imageOnly && !file.mimetype.startsWith('image/')) {
    throw new Error('Logo visual search accepts an image file only.');
  }
}

export function createApp({
  repository,
  storage,
  blockchain,
  demoMode = config.demoMode,
  localUploadsDirectory
}) {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(cors({
    origin: config.corsOrigin.split(',').map((origin) => origin.trim()),
    credentials: false
  }));
  app.use(express.json({ limit: '1mb' }));
  app.use('/api', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false
  }));

  if (localUploadsDirectory) {
    app.use('/uploads', express.static(localUploadsDirectory));
  }

  // Add a temporary signed URL for private-storage images.
  // Existing records keep their stored storageKey; no database migration is needed.
  const withImageUrl = async (record) => {
    if (!record) return record;

    const result = publicRegistration(record);

    if (record.storageKey && typeof storage.getUrl === 'function') {
      result.storageUrl = await storage.getUrl(record.storageKey);
    }

    return result;
  };

  const withImageUrls = async (records) =>
    Promise.all(records.map((record) => withImageUrl(record)));

  app.get('/api/status', (req, res) => res.json({
    api: 'online',
    mode: demoMode ? 'demo' : 'production',
    blockchain: blockchain.configured ? 'configured' : 'unavailable',
    visualSimilarityThreshold: config.visualThreshold,
    legalNotice:
      'ChainProof provides blockchain-backed registration evidence and timestamped proof of existence. It does not replace formal copyright registration or determine legal ownership.'
  }));

  const auth = requireAuth(repository);

  app.post('/api/auth/register', asyncRoute(async (req, res) => {
    const data = z.object({
      name: z.string().trim().min(2).max(80),
      email: z.string().trim().email().max(160),
      password: z.string().min(8).max(128)
    }).parse(req.body);

    if (await repository.findUserByEmail(data.email)) {
      return res.status(409).json({
        error: 'An account with that email already exists.'
      });
    }

    const user = await repository.createUser({
      name: data.name,
      email: data.email,
      passwordHash: await bcrypt.hash(data.password, 12)
    });

    return res.status(201).json({
      token: issueToken(user),
      user: publicUser(user)
    });
  }));

  app.post('/api/auth/login', asyncRoute(async (req, res) => {
    const data = z.object({
      email: z.string().trim().email(),
      password: z.string().min(1).max(128)
    }).parse(req.body);

    const user = await repository.findUserByEmail(data.email);

    if (!user || !await bcrypt.compare(data.password, user.passwordHash)) {
      return res.status(401).json({
        error: 'Incorrect email or password.'
      });
    }

    return res.json({
      token: issueToken(user),
      user: publicUser(user)
    });
  }));

  app.post('/api/auth/logout', (req, res) => res.status(204).end());

  app.get('/api/auth/me', auth, (req, res) =>
    res.json({ user: publicUser(req.user) })
  );

  // Personal registrations
  app.get('/api/ip', auth, asyncRoute(async (req, res) => {
    const records = await repository.userRegistrations(req.user.id);

    return res.json({
      registrations: await withImageUrls(records)
    });
  }));

  // Private registration details, including a temporary signed preview URL where applicable.
  app.get('/api/ip/:ipId', auth, asyncRoute(async (req, res) => {
    registrationId.parse(req.params.ipId);
    const record = await repository.findRegistration(req.params.ipId);

    if (!record) {
      return res.status(404).json({
        error: 'Registration not found.'
      });
    }

    assertRecordAccess(record, req.user);

    const privateRecord = await withImageUrl(record);
    return res.json({
      registration: { ...privateRecord, ...publicRegistrationRecord(record) }
    });
  }));

  // Private version history. A public, storage-safe equivalent is available below.
  app.get('/api/ip/:ipId/versions', auth, asyncRoute(async (req, res) => {
    registrationId.parse(req.params.ipId);
    const current = await repository.findRegistration(req.params.ipId);

    if (!current) {
      return res.status(404).json({ error: 'Registration not found.' });
    }

    assertRecordAccess(current, req.user);
    const versions = await repository.versions(req.params.ipId);

    if (!versions.length) {
      return res.status(404).json({
        error: 'Registration not found.'
      });
    }

    return res.json({
      versions: await withImageUrls(versions)
    });
  }));

  // Register a new work and anchor it to the blockchain.
  app.post(
    '/api/ip/register',
    auth,
    upload.single('file'),
    asyncRoute(async (req, res) => {
      validateFile(req.file);

      const body = z.object({
        title: z.string().trim().min(2).max(140),
        description: z.string().trim().max(3000).optional(),
        category: z.enum(categories),
        creator: z.string().trim().min(2).max(120).optional(),
        license: z.string().trim().min(2).max(120),
        previousIpId: z.string()
          .trim()
          .regex(/^CP-\d{4}-\d{6}$/)
          .optional()
          .or(z.literal(''))
      }).parse(req.body);

      if (
        body.category === 'LOGO' &&
        !req.file.mimetype.startsWith('image/')
      ) {
        return res.status(400).json({
          error: 'Logo registrations require an image file to create a visual fingerprint.'
        });
      }

      if (body.previousIpId) {
        const previous = await repository.findRegistration(body.previousIpId);

        if (!previous) {
          return res.status(400).json({
            error: 'Previous IP ID was not found.'
          });
        }

        if (
          previous.creatorId !== req.user.id &&
          req.user.role !== 'ADMIN'
        ) {
          return res.status(403).json({
            error: 'Only the creator or an administrator can create a new version.'
          });
        }
      }

      const hash = sha256(req.file.buffer);

      if (await repository.findByHash(hash)) {
        return res.status(409).json({
          error: 'This exact file is already registered. Use Verify Work to view its record.'
        });
      }

      const key = storage.keyFor
        ? storage.keyFor(req.file.originalname, hash)
        : `works/${hash.slice(0, 12)}-${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

      const uploadResult = await storage.upload({
        key,
        buffer: req.file.buffer,
        mimeType: req.file.mimetype
      });

      const fingerprint = body.category === 'LOGO'
        ? await logoFingerprint(req.file.buffer)
        : undefined;

      const registration = await repository.createRegistration({
        title: body.title,
        description: body.description || null,
        category: body.category,
        creatorName: body.creator || req.user.name,
        creatorId: req.user.id,
        sha256: hash,
        storageKey: uploadResult.key,
        storageUrl: uploadResult.url || null,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        license: body.license,
        tags: tagsFrom(req.body.tags),
        previousIpId: body.previousIpId || null,
        logoFingerprint: fingerprint
      });

      const anchored = await blockchain.anchor(registration);

      const completed = await repository.updateBlockchain(
        registration.ipId,
        anchored
      );

      return res.status(201).json({
        registration: await withImageUrl(completed),
        hash,
        blockchain: anchored
      });
    })
  );

  // Exact file verification
  app.post(
    '/api/verify/exact',
    optionalAuth(repository),
    upload.single('file'),
    asyncRoute(async (req, res) => {
      validateFile(req.file);

      const hash = sha256(req.file.buffer);
      const record = await repository.findByHash(hash);

      await repository.createVerification({
        type: 'EXACT',
        sha256: hash,
        searchedById: req.user?.id || null,
        matchedRegistrationId: record?.id || null,
        result: record ? 'EXACT_MATCH' : 'NO_EXACT_MATCH'
      });

      return res.json({
        exactMatch: Boolean(record),
        sha256: hash,
        registration: publicRegistrationRecord(record),
        explanation: record
          ? 'The uploaded file exactly matches a registered cryptographic hash.'
          : 'The uploaded file does not exactly match a registered file. This does not determine whether the work legally exists.'
      });
    })
  );

  // Logo visual similarity search
  app.post(
    '/api/logos/search',
    optionalAuth(repository),
    upload.single('file'),
    asyncRoute(async (req, res) => {
      validateFile(req.file, true);

      let fingerprint;

      try {
        fingerprint = await logoFingerprint(req.file.buffer);
      } catch {
        return res.status(400).json({
          error: 'The image could not be processed for logo visual search.'
        });
      }

      const logos = await repository.logoRecords();

      const matching = logos
        .map((record) => ({
          record,
          similarity: similarity(
            fingerprint,
            record.logoFingerprint?.fingerprint
          )
        }))
        .filter((result) => result.similarity >= config.visualThreshold)
        .sort((a, b) => b.similarity - a.similarity);

      const results = matching.map(({ record, similarity: score }) => ({
        registration: publicRegistrationRecord(record),
        similarity: score
      }));

      await repository.createVerification({
        type: 'LOGO_VISUAL',
        searchedById: req.user?.id || null,
        result: results.length ? 'POSSIBLE_MATCH' : 'NO_SIMILAR_MATCH'
      });

      return res.json({
        threshold: config.visualThreshold,
        results,
        explanation:
          'Visual similarity result only. It is not proof of ownership.'
      });
    })
  );

  // Public registry listing
  app.get('/api/registry', asyncRoute(async (req, res) => {
    const filters = z.object({
      q: z.string().max(160).optional(),
      category: z.enum(categories).optional(),
      creator: z.string().max(120).optional(),
      status: z.enum([
        'PENDING', 'CONFIRMED', 'FAILED', 'UNAVAILABLE'
      ]).optional()
    }).parse(req.query);

    const registrations = await repository.listRegistrations(filters);

    return res.json({
      registrations: registrations.map(publicRegistrationRecord)
    });
  }));

  // Legacy public registry detail. Kept for existing links, but only exposes the public metadata whitelist.
  app.get('/api/registry/:ipId', asyncRoute(async (req, res) => {
    registrationId.parse(req.params.ipId);
    const record = await repository.findRegistration(req.params.ipId);

    if (!record) {
      return res.status(404).json({
        error: 'Registration not found.'
      });
    }

    return res.json({
      registration: publicRegistrationRecord(record)
    });
  }));

  // QR-code destination: public, registration-specific, and intentionally free of private storage URLs.
  app.get('/api/public/registrations/:ipId/versions', asyncRoute(async (req, res) => {
    registrationId.parse(req.params.ipId);
    const versions = await repository.versions(req.params.ipId);

    if (!versions.length) {
      return res.status(404).json({ error: 'Registration not found.' });
    }

    return res.json({ versions: versions.map(publicRegistrationRecord) });
  }));

  app.get('/api/public/registrations/:ipId', asyncRoute(async (req, res) => {
    registrationId.parse(req.params.ipId);
    const record = await repository.findRegistration(req.params.ipId);

    if (!record) {
      return res.status(404).json({ error: 'Registration not found.' });
    }

    return res.json({ registration: publicRegistrationRecord(record) });
  }));

  // The browser hashes the actual selected bytes; the API compares only that digest to this specific public record.
  // No verification file is persisted or forwarded to object storage.
  app.post('/api/public/registrations/:ipId/verify', asyncRoute(async (req, res) => {
    registrationId.parse(req.params.ipId);
    const { sha256: uploadedHash } = z.object({ sha256: sha256Value }).parse(req.body);
    const record = await repository.findRegistration(req.params.ipId);

    if (!record) {
      return res.status(404).json({ error: 'Registration not found.' });
    }

    const exactMatch = uploadedHash.toLowerCase() === record.sha256.toLowerCase();

    return res.json({
      exactMatch,
      ipId: record.ipId,
      explanation: exactMatch
        ? 'The selected file exactly matches this registered cryptographic hash.'
        : 'The selected file does not exactly match this registered file. This does not determine whether the work legally exists.'
    });
  }));

  // Admin routes
  app.get('/api/admin/stats', auth, requireAdmin, asyncRoute(async (req, res) =>
    res.json({ stats: await repository.stats() })
  ));

  app.get('/api/admin/users', auth, requireAdmin, asyncRoute(async (req, res) =>
    res.json({ users: await repository.allUsers() })
  ));

  app.get(
    '/api/admin/registrations',
    auth,
    requireAdmin,
    asyncRoute(async (req, res) => {
      const records = await repository.listRegistrations(req.query);

      return res.json({
        registrations: await withImageUrls(records)
      });
    })
  );

  app.use(notFound);
  app.use(errorHandler);

  return app;
}


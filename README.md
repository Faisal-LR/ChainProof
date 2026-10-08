# ChainProof

ChainProof is a full-stack intellectual-property evidence registry. It creates **blockchain-backed registration evidence**, timestamped proof of existence, and exact cryptographic file verification. It does **not** replace formal copyright registration or decide legal ownership.

## What is included

- React + Vite responsive dark SaaS interface with landing page, account flow, dashboard, registration, verification, logo search, public registry, record detail, versions, profile, admin and system-status pages.
- Express REST API with JWT authentication, bcrypt password hashing, Zod validation, rate limits, Helmet/CORS, upload limits and protected admin routes.
- PostgreSQL + Prisma schema/migration for users, registrations, versions, fingerprints, verification records, blockchain transactions, audit logs and an IP ID counter.
- SHA-256 exact-file verification for every IP category.
- Logo-only perceptual image hashing and ranked visual similarity. It is deliberately not used for other categories and is labeled as a possible visual match, not ownership proof.
- Local-development file storage plus an S3/R2 storage abstraction for production persistence.
- Solidity registry, deployment script and Hardhat test. The contract stores metadata and a content hash, never the copyrighted file itself.
- A no-database local **DEMO MODE** with seed records and a demo administrator, so a presentation can start immediately.

## Structure

```text
ChainProof/
├── frontend/             React + Vite client 
├── backend/              Express API, Prisma schema, storage and services
│   ├── prisma/           PostgreSQL schema, migration and optional seed
│   └── src/
├── contracts/            Solidity contract, Hardhat config, tests, deploy script
├── docs/                 Architecture/viva notes
├── README.md
└── package.json          npm workspaces
```

## Local quick start

Requires Node.js 20+ and npm. PostgreSQL is required for production mode, but not for the demo mode.

```bash
npm install
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
npm run build
npm run dev
```

Open `http://localhost:5173`. When `DATABASE_URL` is absent (or `DEMO_MODE=true`), the API starts in **DEMO MODE**. Use the regular registration page, or sign in as `demo@chainproof.local` with password `Demo123!` to view the admin dashboard. These credentials must not be used in a deployed system.

Run verification separately:

```bash
npm test
npm run build
npm run dev --workspace backend
```

## Production PostgreSQL setup

1. Create a hosted PostgreSQL database (Railway, Render, Neon, Supabase, etc.).
2. Set `DATABASE_URL` in `backend/.env` to its PostgreSQL connection string and set a long random `JWT_SECRET`.
3. Keep `DEMO_MODE=false`.
4. Apply checked-in migrations: `npm run db:migrate`.
5. Optional presentation records: `npm run seed`.

The production database is PostgreSQL; browser localStorage is used only for a client session token, never as the production IP registry.

## Environment variables

See [`backend/.env.example`](backend/.env.example) and [`frontend/.env.example`](frontend/.env.example).

| Variable | Use |
|---|---|
| `DATABASE_URL` | PostgreSQL connection URL |
| `JWT_SECRET` | Secret used to sign login tokens; required in production |
| `CORS_ORIGIN` | Deployed frontend URL, e.g. `https://your-app.vercel.app` |
| `VITE_API_URL` | Public API URL ending with `/api` |
| `STORAGE_PROVIDER` | `s3` or `r2` in production; `local` is development-only |
| `STORAGE_*` | Bucket, endpoint and server-side object storage credentials |
| `RPC_URL`, `CHAIN_ID`, `PRIVATE_KEY`, `CONTRACT_ADDRESS` | Ethereum-compatible contract integration |
| `VISUAL_SIMILARITY_THRESHOLD` | Logo match percentage, default `65` |

Do not commit `.env` files, a wallet private key, object-storage secret, or production database URL.

## Object storage

For Cloudflare R2 set `STORAGE_PROVIDER=r2`, the account S3 endpoint, bucket name, access key and secret. For Amazon S3 use `STORAGE_PROVIDER=s3`, region, bucket and IAM credentials (endpoint is optional). Files are uploaded through the backend; credentials never reach the browser. `local` writes to `backend/uploads` only in development and is refused in production.

## Smart contract and blockchain

```bash
cd contracts
Copy-Item .env.example .env
npx hardhat compile
npx hardhat test
# with a configured RPC_URL and PRIVATE_KEY:
npx hardhat run scripts/deploy.js --network configured
```

Copy the deployed address to backend `CONTRACT_ADDRESS`, along with the RPC URL, chain ID and private key. ChainProof submits `IP ID`, SHA-256 content hash, sender address, timestamp, category, license, version and predecessor ID. It waits for a successful receipt before marking a record `CONFIRMED`. Without valid configuration it displays **Blockchain unavailable**; it never invents a transaction hash or confirmation.

## Deployment

### Frontend on Vercel

Import the repository as a Vercel project. Set root directory to `frontend`, build command to `npm run build`, output directory to `dist`, and set `VITE_API_URL=https://YOUR-API.example/api`. `frontend/vercel.json` handles browser-router deep links.

### Backend on Render or Railway

Deploy from the `backend` directory with build command `npm install && npm run build` and start command `npm start`. Use `backend/render.yaml` as a Render blueprint if desired. Set every required production environment variable, especially PostgreSQL, CORS, S3/R2 and JWT configuration. Run `npm run db:migrate` once against the hosted database during release.

## Professor demonstration

1. Run the local application and create an account (or use the Demo administrator).
2. Register a **Logo** image. The form shows its SHA-256 before submission and returns a persisted IP ID such as `CP-2026-000005`.
3. On the confirmation card, show creator, timestamp, license, version and the real blockchain status. With no credentials it accurately says unavailable.
4. Open **Verify Work**, upload the unmodified original, and show `EXACT MATCH FOUND`.
5. Change the file even slightly, re-upload, and show `NO EXACT MATCH FOUND`.
6. Open **Logo Search**, use the original logo or a comparable screenshot/photo, and show ranked possible visual matches. Explain it is a visual similarity result only.
7. Register the revised file using the first record’s IP ID in **Previous IP ID** and open its version timeline.
8. Find both records in **Public Registry**, open the evidence detail, then sign out and sign back in.

## Testing and current limits

`npm test` runs Express demo integration tests (account registration, login, JWT authorization, work registration and version history, SHA-256 exact match/non-match, logo visual search, and admin authorization) and the Solidity contract test. `npm run build` compiles the frontend and Prisma client. A real PostgreSQL/S3/R2/Ethereum confirmation requires your own external credentials and is intentionally not claimed as tested without them.

The perceptual hash is a lightweight local logo fingerprint designed for common resizes, compression and lighting changes. It is not a machine-learning recognition service and may be less robust to extreme perspective, heavy cropping, or a photograph taken at a difficult angle. The similarity threshold is configurable.

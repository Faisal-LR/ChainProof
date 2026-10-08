# ChainProof architecture and viva notes

## Evidence path

```text
Browser → React/Vite → Express API → PostgreSQL (metadata)
                                  → S3/R2 (original file)
                                  → Ethereum-compatible RPC → ChainProofRegistry (hash + evidence metadata)
```

The file itself never goes on-chain. That keeps costs, privacy exposure and storage size practical. The application database stores searchable metadata and relationships; object storage holds the original binary; the contract holds an independently queryable proof record.

## Why each technology is used

- **SHA-256:** a content-addressable, deterministic cryptographic digest. The exact same bytes produce the same hash; even a one-byte change gives a different result. Therefore it powers exact verification for all categories, but cannot find a visually similar photo.
- **Perceptual fingerprint:** creates a compact image representation based on normalized image luminance. Its Hamming similarity can tolerate ordinary image transformations. It is restricted to `LOGO` registrations because visual comparison is not appropriate for a document, source archive, song, research or other listed category.
- **PostgreSQL + Prisma:** PostgreSQL persists relational entities, constraints and version histories safely across restarts. Prisma provides typed data access and migrations. Neither is replaced by JSON files or frontend storage in production.
- **S3-compatible storage:** hosted application filesystems can disappear after deployment. R2/S3 provides durable object storage, while a storage adapter allows migration between providers without changing routes.
- **Express backend:** passwords, object-storage credentials and blockchain private keys never enter the browser. The API enforces validation, authorization and upload limits.
- **Solidity contract:** emits an `IPRegistered` event and stores an evidence record containing IP ID, hash, creator wallet, timestamp, category, license, version and predecessor. It does not say that a party legally owns copyright.
- **React frontend:** separates reusable UI pieces and route pages, keeps the workflow approachable, and clearly distinguishes exact matches from logo visual similarity.

## Data model

`User → IPRegistration → IPVersion / BlockchainTransaction` represents the creator and each immutable version. A Logo registration optionally has exactly one `LogoFingerprint`. `VerificationRecord` provides an audit trail for exact and visual checks. `RegistryCounter` creates persisted sequential IP IDs.

## Important legal wording

Present the system as providing **blockchain-backed registration evidence**, **timestamped proof of existence**, and **exact cryptographic verification**. Do not say “copyright guaranteed”, “blockchain proves legal ownership”, or that a failed exact match means the work legally does not exist.

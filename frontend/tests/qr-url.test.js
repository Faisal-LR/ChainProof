import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_PRODUCTION_APP_URL,
  publicVerificationUrl,
  resolvePublicAppUrl
} from '../src/public-url.js';
import { generateRegistrationQrPng } from '../src/registration-qr-code.js';

test('uses the configured canonical production URL and removes trailing slashes', () => {
  assert.equal(
    resolvePublicAppUrl({ configuredUrl: 'https://chain-proof-six.vercel.app/', production: true }),
    'https://chain-proof-six.vercel.app'
  );
});

test('falls back to the ChainProof production domain and refuses localhost in production', () => {
  assert.equal(resolvePublicAppUrl({ production: true }), DEFAULT_PRODUCTION_APP_URL);
  assert.equal(
    resolvePublicAppUrl({ configuredUrl: 'http://localhost:5173', production: true }),
    DEFAULT_PRODUCTION_APP_URL
  );
  assert.equal(
    resolvePublicAppUrl({ configuredUrl: 'http://[::1]:5173', production: true }),
    DEFAULT_PRODUCTION_APP_URL
  );
});

test('keeps the current local origin for development when no URL is configured', () => {
  assert.equal(
    resolvePublicAppUrl({ browserOrigin: 'http://localhost:5173/' }),
    'http://localhost:5173'
  );
});

test('forms the requested verification URL with the registration ID intact', () => {
  assert.equal(
    publicVerificationUrl('CP-2026-000008'),
    'https://chain-proof-six.vercel.app/verify/CP-2026-000008'
  );
});

test('passes the exact public URL to the PNG encoder', async () => {
  let encodedUrl;
  let encoderOptions;
  const expectedPng = 'data:image/png;base64,encoded-qr';
  const png = await generateRegistrationQrPng('CP-2026-000008', {
    toDataURL(url, options) {
      encodedUrl = url;
      encoderOptions = options;
      return Promise.resolve(expectedPng);
    }
  });

  assert.equal(encodedUrl, 'https://chain-proof-six.vercel.app/verify/CP-2026-000008');
  assert.equal(encoderOptions.width, 360);
  assert.equal(png, expectedPng);
});

test('generates a PNG data URL for the registration QR', async () => {
  const png = await generateRegistrationQrPng('CP-2026-000008');
  assert.match(png, /^data:image\/png;base64,/);
});

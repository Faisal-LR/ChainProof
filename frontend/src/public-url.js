export const DEFAULT_PRODUCTION_APP_URL = 'https://chain-proof-six.vercel.app';

function normalizedUrl(value) {
  const candidate = String(value || '').trim().replace(/\/+$/, '');
  if (!candidate) return '';

  try {
    const url = new URL(candidate);
    if (!['http:', 'https:'].includes(url.protocol) || url.search || url.hash) return '';
    return candidate;
  } catch {
    return '';
  }
}

function isLocalUrl(value) {
  try {
    const { hostname } = new URL(value);
    return hostname === 'localhost' || hostname === '::1' || hostname === '[::1]' || hostname === '0.0.0.0' || /^127(?:\.\d{1,3}){3}$/.test(hostname);
  } catch {
    return false;
  }
}

export function resolvePublicAppUrl({ configuredUrl, production = false, browserOrigin = '' } = {}) {
  const configured = normalizedUrl(configuredUrl);
  if (configured && !(production && isLocalUrl(configured))) return configured;
  if (production) return DEFAULT_PRODUCTION_APP_URL;

  const origin = normalizedUrl(browserOrigin);
  return origin || DEFAULT_PRODUCTION_APP_URL;
}

export function publicAppUrl() {
  const env = import.meta.env || {};
  return resolvePublicAppUrl({
    configuredUrl: env.VITE_PUBLIC_APP_URL,
    production: Boolean(env.PROD),
    browserOrigin: typeof window === 'undefined' ? '' : window.location.origin
  });
}

export function publicVerificationUrl(ipId) {
  return `${publicAppUrl()}/verify/${encodeURIComponent(ipId)}`;
}

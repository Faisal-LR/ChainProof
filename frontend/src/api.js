const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

async function request(path, { token, body, method = 'GET', form = false } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(!form && body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? (form ? body : JSON.stringify(body)) : undefined
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(data.error || 'The request could not be completed.', response.status);
  return data;
}

export const api = {
  url: API_URL,
  assetUrl(value) { return value?.startsWith('/') ? `${API_URL.replace(/\/api$/, '')}${value}` : value; },
  status: () => request('/status'),
  login: (body) => request('/auth/login', { method: 'POST', body }),
  register: (body) => request('/auth/register', { method: 'POST', body }),
  me: (token) => request('/auth/me', { token }),
  mine: (token) => request('/ip', { token }),
  registration: (ipId) => request(`/ip/${encodeURIComponent(ipId)}`),
  versions: (ipId) => request(`/ip/${encodeURIComponent(ipId)}/versions`),
  registerWork: (token, form) => request('/ip/register', { token, method: 'POST', body: form, form: true }),
  exact: (form, token) => request('/verify/exact', { token, method: 'POST', body: form, form: true }),
  logoSearch: (form, token) => request('/logos/search', { token, method: 'POST', body: form, form: true }),
  registry: (params = {}) => request(`/registry?${new URLSearchParams(Object.entries(params).filter(([, value]) => value)).toString()}`),
  adminStats: (token) => request('/admin/stats', { token }),
  adminUsers: (token) => request('/admin/users', { token }),
  adminRegistrations: (token) => request('/admin/registrations', { token })
};

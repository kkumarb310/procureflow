// Tiny fetch wrapper around the ProcureFlow API.
// In dev, VITE_API_URL is empty and requests go through the Vite proxy (/api).
// In prod, set VITE_API_URL to the deployed API origin.

const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const TOKEN_KEY = 'pf_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) data = await res.json();

  if (!res.ok) {
    const message = (data && data.error) || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  // auth
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password }, auth: false }),
  register: (payload) => request('/auth/register', { method: 'POST', body: payload, auth: false }),
  me: () => request('/auth/me'),

  // catalog
  items: (search = '') => request(`/items${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  createItem: (name, category) => request('/items', { method: 'POST', body: { name, category } }),
  deleteItem: (id) => request(`/items/${id}`, { method: 'DELETE' }),

  // requests
  listRequests: (status) => request(`/requests${status && status !== 'all' ? `?status=${status}` : ''}`),
  createRequest: (payload) => request('/requests', { method: 'POST', body: payload }),
  setStatus: (id, status, adminNotes) =>
    request(`/requests/${id}/status`, { method: 'PATCH', body: { status, adminNotes } }),

  // reports
  reportSummary: () => request('/reports/summary'),
};

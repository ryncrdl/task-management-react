import axios from 'axios';

const LARAVEL_API_URL = import.meta.env.VITE_LARAVEL_API_URL || 'http://localhost:8000/api';
const NODE_API_URL = import.meta.env.VITE_NODE_API_URL || 'http://localhost:3000/api';

// ─── Token refresh state (shared across all requests) ───────────────────────
let isRefreshing = false;
let failedQueue = [];

function processQueue(error, token = null) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
}

function redirectToLogin() {
  localStorage.removeItem('token');
  if (!window.location.pathname.includes('/login')) {
    window.location.href = '/login';
  }
}

// ─── Axios instances ─────────────────────────────────────────────────────────
export const laravelApi = axios.create({
  baseURL: LARAVEL_API_URL,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  timeout: 15000,
});

export const nodeApi = axios.create({
  baseURL: NODE_API_URL,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  timeout: 15000,
});

// ─── Request interceptor: inject Bearer token ────────────────────────────────
[laravelApi, nodeApi].forEach((instance) => {
  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
});

// ─── Laravel response interceptor: silent token refresh on 401 ───────────────
laravelApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const original = error.config;

    if (error.response?.status !== 401) return Promise.reject(error);

    // Never retry refresh / login endpoints — that would loop forever
    const isAuthEndpoint =
      original.url?.includes('/auth/refresh') ||
      original.url?.includes('/auth/login') ||
      original._retry;

    if (isAuthEndpoint) {
      redirectToLogin();
      return Promise.reject(error);
    }

    // If a refresh is already in-flight, queue this request until it resolves
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((newToken) => {
          original.headers.Authorization = `Bearer ${newToken}`;
          return laravelApi(original);
        })
        .catch(Promise.reject);
    }

    original._retry = true;
    isRefreshing = true;

    return new Promise((resolve, reject) => {
      laravelApi
        .post('/auth/refresh')
        .then(({ data }) => {
          const newToken = data.data.token;
          localStorage.setItem('token', newToken);
          // Notify AuthContext so React state stays in sync
          window.dispatchEvent(new CustomEvent('token:refreshed', { detail: newToken }));
          original.headers.Authorization = `Bearer ${newToken}`;
          processQueue(null, newToken);
          resolve(laravelApi(original));
        })
        .catch((err) => {
          processQueue(err, null);
          redirectToLogin();
          reject(err);
        })
        .finally(() => {
          isRefreshing = false;
        });
    });
  },
);

// ─── Node response interceptor: simple 401 redirect ─────────────────────────
nodeApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) redirectToLogin();
    return Promise.reject(error);
  },
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Decode the JWT payload and return the expiry timestamp (ms).
 * Returns null if the token is missing or malformed.
 */
export function getTokenExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * Extract a friendly error message from an Axios error.
 */
export function getErrorMessage(error) {
  if (error.response?.data?.message) return error.response.data.message;
  if (error.response?.data?.errors) {
    const msgs = Object.values(error.response.data.errors).flat();
    return msgs[0] || 'Validation error.';
  }
  if (error.message) return error.message;
  return 'An unexpected error occurred.';
}

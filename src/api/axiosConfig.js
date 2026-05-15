import axios from 'axios';

const LARAVEL_API_URL = import.meta.env.VITE_LARAVEL_API_URL || 'http://localhost:8000/api';
const NODE_API_URL = import.meta.env.VITE_NODE_API_URL || 'http://localhost:3000/api';

function createInstance(baseURL) {
  const instance = axios.create({
    baseURL,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    timeout: 15000,
  });

  // Inject token on every request
  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // Global response error handling
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        // Redirect to login without importing router (avoids circular deps)
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    }
  );

  return instance;
}

export const laravelApi = createInstance(LARAVEL_API_URL);
export const nodeApi = createInstance(NODE_API_URL);

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

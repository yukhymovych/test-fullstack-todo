const API_PORT = import.meta.env.VITE_API_PORT || '4000';

/** When in browser, use current host so mobile (192.168.x.x) reaches API on same machine. */
export const API_URL =
  typeof window !== 'undefined'
    ? `http://${window.location.hostname}:${API_PORT}`
    : (import.meta.env.VITE_API_URL || `http://localhost:${API_PORT}`);

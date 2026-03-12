const API_PORT = import.meta.env.VITE_API_PORT || '4000';

export const API_URL =
  import.meta.env.VITE_API_URL || `http://localhost:${API_PORT}`;

export const AUTH0_DOMAIN = import.meta.env.VITE_AUTH0_DOMAIN || '';
export const AUTH0_CLIENT_ID = import.meta.env.VITE_AUTH0_CLIENT_ID || '';
export const AUTH0_AUDIENCE = import.meta.env.VITE_AUTH0_AUDIENCE || '';

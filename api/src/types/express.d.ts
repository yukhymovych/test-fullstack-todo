import type { JWTPayload } from 'express-oauth2-jwt-bearer';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string | null;
        name?: string | null;
      };
      auth?: {
        payload: JWTPayload;
        header: Record<string, unknown>;
        token: string;
      };
    }
  }
}

export {};

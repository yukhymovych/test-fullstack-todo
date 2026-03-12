import { Request, Response, NextFunction } from 'express';
import { auth } from 'express-oauth2-jwt-bearer';
import * as authSQL from '../modules/auth/auth.sql.js';

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE;

if (!AUTH0_DOMAIN) {
  throw new Error('AUTH0_DOMAIN environment variable is not set');
}
if (!AUTH0_AUDIENCE) {
  throw new Error('AUTH0_AUDIENCE environment variable is not set');
}

const checkJwt = auth({
  issuerBaseURL: `https://${AUTH0_DOMAIN}`,
  audience: AUTH0_AUDIENCE,
});

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  checkJwt(req, res, (err?: unknown) => {
    if (err) {
      next(err);
      return;
    }

    const payload = req.auth?.payload;
    if (!payload?.sub) {
      res.status(401).json({ error: 'Missing subject in token' });
      return;
    }

    const sub = payload.sub;
    const email =
      typeof payload.email === 'string' ? payload.email : null;
    const name = typeof payload.name === 'string' ? payload.name : null;

    authSQL
      .findOrCreateByAuth0Sub(sub, email, name)
      .then((user) => {
        req.user = { id: user.id, email: user.email, name: user.name };
        next();
      })
      .catch(next);
  });
}

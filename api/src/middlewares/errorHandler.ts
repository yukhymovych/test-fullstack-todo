import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

interface ErrorWithStatusCode extends Error {
  statusCode?: number;
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(err);

  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation error',
      details: err.errors,
    });
    return;
  }

  const statusCode = (err as ErrorWithStatusCode).statusCode;
  if (statusCode === 400) {
    res.status(400).json({ error: (err as Error).message });
    return;
  }
  if (statusCode === 404) {
    res.status(404).json({ error: (err as Error).message });
    return;
  }
  if (statusCode === 403) {
    res.status(403).json({ error: (err as Error).message });
    return;
  }
  if (statusCode === 401) {
    res.status(401).json({ error: (err as Error).message });
    return;
  }
  if (statusCode === 409) {
    res.status(409).json({ error: (err as Error).message });
    return;
  }
  if (statusCode === 429) {
    res.status(429).json({ error: (err as Error).message });
    return;
  }
  if (statusCode === 502) {
    res.status(502).json({ error: (err as Error).message });
    return;
  }

  res.status(500).json({
    error: 'Internal server error',
  });
}

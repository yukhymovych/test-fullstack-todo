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
  if (statusCode === 401) {
    res.status(401).json({ error: (err as Error).message });
    return;
  }
  if (statusCode === 409) {
    res.status(409).json({ error: (err as Error).message });
    return;
  }

  res.status(500).json({
    error: 'Internal server error',
  });
}

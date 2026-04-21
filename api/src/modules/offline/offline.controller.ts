import type { Request, Response, NextFunction } from 'express';
import * as offlineService from './offline.service.js';

export async function getSnapshot(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const snapshot = await offlineService.buildSnapshot(userId);
    res.json(snapshot);
  } catch (error) {
    next(error);
  }
}

export async function getChanges(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const since = parseSince(req.query.since);
    if (since === null) {
      res.status(400).json({ error: '`since` must be a valid ISO 8601 timestamp' });
      return;
    }
    const changes = await offlineService.buildChangesSince(userId, since);
    res.json(changes);
  } catch (error) {
    next(error);
  }
}

function parseSince(value: unknown): Date | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return null;
  return new Date(ms);
}

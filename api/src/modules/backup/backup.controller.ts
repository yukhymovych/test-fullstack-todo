import { Request, Response, NextFunction } from 'express';
import * as backupService from './backup.service.js';
import {
  exportBackupQuerySchema,
  importBackupBodySchema,
} from './backup.schemas.js';

export async function exportBackup(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const query = exportBackupQuerySchema.parse(req.query);
    const document = await backupService.exportBackup(userId, {
      scope: query.scope,
      rootNoteId: query.rootNoteId,
    });
    res.json(document);
  } catch (error) {
    next(error);
  }
}

export async function importBackup(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const body = importBackupBodySchema.parse(req.body);
    const result = await backupService.importBackup(userId, body.document, {
      preserveStudyState: body.preserveStudyState,
    });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

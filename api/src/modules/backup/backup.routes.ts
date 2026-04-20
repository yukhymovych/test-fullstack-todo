import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import * as backupController from './backup.controller.js';

export const backupRouter = Router();

backupRouter.use(requireAuth);

backupRouter.get('/export', backupController.exportBackup);
backupRouter.post('/import', backupController.importBackup);

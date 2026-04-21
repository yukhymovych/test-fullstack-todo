import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import * as offlineController from './offline.controller.js';

export const offlineRouter = Router();

offlineRouter.use(requireAuth);

offlineRouter.get('/snapshot', offlineController.getSnapshot);
offlineRouter.get('/changes', offlineController.getChanges);

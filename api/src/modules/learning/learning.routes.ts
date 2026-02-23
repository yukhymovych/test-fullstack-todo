import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import * as learningController from './learning.controller.js';

export const learningRouter = Router();

learningRouter.use(requireAuth);

learningRouter.post('/session/start', learningController.startSession);
learningRouter.post('/session/start-scoped', learningController.startScopedSession);
learningRouter.get('/session/today', learningController.getTodaySession);
learningRouter.post(
  '/session/refill-debug',
  learningController.refillSessionDebug
);
learningRouter.post(
  '/session/item/:id/grade',
  learningController.gradeSessionItem
);
learningRouter.post('/session/grade-by-page', learningController.gradeByPage);
learningRouter.post('/study-items/activate', learningController.activateStudyItem);
learningRouter.post(
  '/study-items/activate-scoped',
  learningController.activateStudyItemScoped
);
learningRouter.post(
  '/study-items/deactivate',
  learningController.deactivateStudyItem
);
learningRouter.get(
  '/study-items/due-count',
  learningController.getDueStudyItemsCount
);
learningRouter.get('/study-items/status', learningController.getStudyItemStatus);

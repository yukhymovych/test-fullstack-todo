import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import * as learningController from './learning.controller.js';

export const learningRouter = Router();

learningRouter.use(requireAuth);

learningRouter.post('/session/start', learningController.startSession);
learningRouter.post('/scoped/start', learningController.startScopedSession);
learningRouter.get('/scoped/today', learningController.getTodayScopedSessions);
learningRouter.get('/sessions/:id', learningController.getSessionById);
learningRouter.get('/session/today', learningController.getTodaySession);
learningRouter.post(
  '/session/reset-debug',
  learningController.resetSessionDebug
);
learningRouter.post(
  '/session/delete-future-debug',
  learningController.deleteFutureSessionsDebug
);
learningRouter.post(
  '/session/delete-today-scoped-debug',
  learningController.deleteTodayScopedSessionsDebug
);
learningRouter.post(
  '/session/refill-debug',
  learningController.refillSessionDebug
);
learningRouter.post(
  '/session/refresh-all-grades-debug',
  learningController.refreshAllGradesDebug
);
learningRouter.post(
  '/session/item/:id/grade',
  learningController.gradeSessionItem
);
learningRouter.post('/session/grade-by-page', learningController.gradeByPage);
learningRouter.post('/reviews/undo', learningController.undoReviewGrade);
learningRouter.get('/reviews/today', learningController.getTodayReviewLogs);
learningRouter.post('/study-items/activate', learningController.activateStudyItem);
learningRouter.post(
  '/study-items/activate-scoped',
  learningController.activateStudyItemScoped
);
learningRouter.post(
  '/study-items/activate-descendants',
  learningController.activateStudyItemDescendantsOnly
);
learningRouter.post(
  '/study-items/deactivate',
  learningController.deactivateStudyItem
);
learningRouter.get(
  '/study-items/due-count',
  learningController.getDueStudyItemsCount
);
learningRouter.get(
  '/study-items/due',
  learningController.getDueStudyItems
);
learningRouter.get(
  '/study-items/descendants-with-learning-count',
  learningController.getDescendantsWithLearningCount
);
learningRouter.get('/study-items/status', learningController.getStudyItemStatus);
learningRouter.get(
  '/study-items/review-logs',
  learningController.getStudyItemReviewLogs
);

import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import * as remindersController from './reminders.controller.js';

export const remindersRouter = Router();

remindersRouter.use(requireAuth);

remindersRouter.post(
  '/push-subscriptions',
  remindersController.savePushSubscription
);
remindersRouter.delete(
  '/push-subscriptions',
  remindersController.deactivatePushSubscription
);
remindersRouter.patch(
  '/users/me/reminder-settings',
  remindersController.patchReminderSettings
);
remindersRouter.get(
  '/users/me/reminder-settings',
  remindersController.getReminderState
);
remindersRouter.post(
  '/debug/run-daily-job',
  remindersController.runDailyReminderJobDebug
);

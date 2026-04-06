import type { NextFunction, Request, Response } from 'express';
import * as remindersService from './reminders.service.js';
import {
  deactivatePushSubscriptionBodySchema,
  pushSubscriptionBodySchema,
  updateReminderSettingsBodySchema,
} from './reminders.schemas.js';

export async function savePushSubscription(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const input = pushSubscriptionBodySchema.parse(req.body);
    await remindersService.savePushSubscription({
      userId,
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      expirationTime: input.expirationTime ?? null,
      userAgent: req.get('user-agent') ?? null,
    });
    console.log('[reminders] subscription saved', { userId });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function deactivatePushSubscription(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const input = deactivatePushSubscriptionBodySchema.parse(req.body);
    await remindersService.deactivatePushSubscription(userId, input.endpoint);
    console.log('[reminders] subscription deactivated', { userId });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function patchReminderSettings(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const input = updateReminderSettingsBodySchema.parse(req.body);
    const result = await remindersService.updateReminderSettings(
      userId,
      input.dailyRemindersEnabled
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getReminderState(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const state = await remindersService.getReminderState(userId);
    res.json(state);
  } catch (error) {
    next(error);
  }
}

export async function runDailyReminderJobDebug(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const result = await remindersService.scheduleDebugPushForUser(userId, 10);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

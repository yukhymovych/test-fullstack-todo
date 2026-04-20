import type { NextFunction, Request, Response } from 'express';
import * as remindersService from './reminders.service.js';

export async function postRunDueReminders(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const stats = await remindersService.runDueRemindersJob();
    res.json({ ok: true, stats });
  } catch (error) {
    next(error);
  }
}

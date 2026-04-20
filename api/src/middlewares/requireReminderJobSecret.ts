import type { NextFunction, Request, Response } from 'express';

export function requireReminderJobSecret(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const configured = process.env.REMINDER_JOB_SECRET;
  if (!configured || configured.length === 0) {
    res.status(503).json({ ok: false, error: 'Reminder job is not configured' });
    return;
  }

  const header = req.get('X-Reminder-Job-Secret');
  const bearer = req.get('Authorization')?.replace(/^Bearer\s+/i, '');
  const secret = header ?? bearer;

  if (!secret || secret !== configured) {
    res.status(401).json({ ok: false, error: 'Unauthorized' });
    return;
  }

  next();
}

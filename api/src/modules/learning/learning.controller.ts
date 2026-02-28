import { Request, Response, NextFunction } from 'express';
import * as learningService from './learning.service.js';
import {
  startSessionSchema,
  startScopedSessionSchema,
  gradeBodySchema,
  gradeByPageBodySchema,
  studyItemStatusQuerySchema,
  descendantsWithLearningQuerySchema,
  activateBodySchema,
  activateScopedBodySchema,
  deactivateBodySchema,
  sessionItemIdSchema,
} from './learning.schemas.js';

export async function startSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const input = startSessionSchema.parse(req.body);
    const timezone = await learningService.resolveTimezone(
      userId,
      input.timezone
    );
    const data = await learningService.startSession(userId, timezone);
    if (!data) {
      res.status(200).json(null);
      return;
    }
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
}

export async function startScopedSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const input = startScopedSessionSchema.parse(req.body);
    const timezone = await learningService.resolveTimezone(
      userId,
      input.timezone
    );
    const result = await learningService.startScopedSession(
      userId,
      input.rootNoteId,
      timezone
    );
    if ('reason' in result) {
      res.status(200).json({ created: false, reason: result.reason });
      return;
    }
    const status = result.created ? 201 : 200;
    res.status(status).json({
      created: result.created,
      sessionId: result.sessionId,
      total: result.total,
      session: result.session,
    });
  } catch (error) {
    next(error);
  }
}

export async function getTodayScopedSessions(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const timezoneParam = req.query.timezone;
    const timezone = await learningService.resolveTimezone(
      userId,
      typeof timezoneParam === 'string' ? timezoneParam : undefined
    );
    const sessions = await learningService.listTodayScopedSessions(
      userId,
      timezone
    );
    res.json(sessions);
  } catch (error) {
    next(error);
  }
}

export async function getSessionById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const sessionId = sessionItemIdSchema.parse(req.params.id);
    const data = await learningService.getSessionById(userId, sessionId);
    if (!data) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function getTodaySession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const timezoneParam = req.query.timezone;
    const timezone = await learningService.resolveTimezone(
      userId,
      typeof timezoneParam === 'string' ? timezoneParam : undefined
    );
    const data = await learningService.getTodaySession(userId, timezone);
    if (!data) {
      res.json(null);
      return;
    }
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function gradeByPage(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const input = gradeByPageBodySchema.parse(req.body);
    const timezoneParam = req.query.timezone;
    const timezone = await learningService.resolveTimezone(
      userId,
      typeof timezoneParam === 'string' ? timezoneParam : undefined
    );
    const result = await learningService.gradeByPage(
      userId,
      input.pageId,
      input.grade,
      timezone
    );
    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function gradeSessionItem(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = sessionItemIdSchema.parse(req.params.id);
    const input = gradeBodySchema.parse(req.body);
    const result = await learningService.gradeSessionItem(
      userId,
      id,
      input.grade
    );
    if (!result.success) {
      res.status(404).json({ error: result.error });
      return;
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function activateStudyItemScoped(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const input = activateScopedBodySchema.parse(req.body);
    const result = await learningService.activateStudyItemScoped(
      userId,
      input.scopePageId
    );
    if (!result) {
      res.status(404).json({ error: 'Page not found' });
      return;
    }
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function activateStudyItem(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const input = activateBodySchema.parse(req.body);
    const item = await learningService.activateStudyItem(userId, input.pageId);
    if (!item) {
      res.status(404).json({ error: 'Page not found' });
      return;
    }
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
}

export async function deactivateStudyItem(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const input = deactivateBodySchema.parse(req.body);
    const result = await learningService.deactivateStudyItem(
      userId,
      input.pageId
    );
    if (!result) {
      res.status(404).json({ error: 'Study item not found' });
      return;
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function resetSessionDebug(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const timezoneParam = req.query.timezone;
    const timezone = await learningService.resolveTimezone(
      userId,
      typeof timezoneParam === 'string' ? timezoneParam : undefined
    );
    const data = await learningService.resetSessionDebug(userId, timezone);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function deleteFutureSessionsDebug(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const timezoneParam = req.query.timezone;
    const timezone = await learningService.resolveTimezone(
      userId,
      typeof timezoneParam === 'string' ? timezoneParam : undefined
    );
    const data = await learningService.deleteFutureSessionsDebug(
      userId,
      timezone
    );
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function deleteTodayScopedSessionsDebug(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const timezoneParam = req.query.timezone;
    const timezone = await learningService.resolveTimezone(
      userId,
      typeof timezoneParam === 'string' ? timezoneParam : undefined
    );
    const data = await learningService.deleteTodayScopedSessionsDebug(
      userId,
      timezone
    );
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function refillSessionDebug(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const timezoneParam = req.query.timezone;
    const timezone = await learningService.resolveTimezone(
      userId,
      typeof timezoneParam === 'string' ? timezoneParam : undefined
    );
    const data = await learningService.refillSessionDebug(userId, timezone);
    if (!data) {
      res.status(404).json({ error: 'No session found' });
      return;
    }
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function refreshAllGradesDebug(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const timezoneParam = req.query.timezone;
    const timezone = await learningService.resolveTimezone(
      userId,
      typeof timezoneParam === 'string' ? timezoneParam : undefined
    );
    const data = await learningService.refreshAllGradesDebug(userId, timezone);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function getDueStudyItemsCount(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const count = await learningService.getDueStudyItemsCount(userId);
    res.json({ count });
  } catch (error) {
    next(error);
  }
}

export async function getDescendantsWithLearningCount(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { rootNoteId } = descendantsWithLearningQuerySchema.parse(req.query);
    const count = await learningService.getDescendantsWithLearningCount(
      userId,
      rootNoteId
    );
    res.json({ count });
  } catch (error) {
    next(error);
  }
}

export async function getStudyItemStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { pageId } = studyItemStatusQuerySchema.parse(req.query);
    const timezoneParam = req.query.timezone;
    const timezone = await learningService.resolveTimezone(
      userId,
      typeof timezoneParam === 'string' ? timezoneParam : undefined
    );
    const status = await learningService.getStudyItemStatus(
      userId,
      pageId,
      timezone
    );
    res.json(status);
  } catch (error) {
    next(error);
  }
}

export async function getStudyItemReviewLogs(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { pageId } = studyItemStatusQuerySchema.parse(req.query);
    const logs = await learningService.getStudyItemReviewLogs(userId, pageId);
    res.json(logs);
  } catch (error) {
    next(error);
  }
}

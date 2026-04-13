import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middlewares/requireAuth.js';
import * as authSQL from './auth.sql.js';

export const authRouter = Router();

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({
    id: req.user!.id,
    email: req.user!.email,
    name: req.user!.name,
  });
});

authRouter.get('/me/preferences', requireAuth, async (req, res, next) => {
  try {
    const uiLanguage = await authSQL.getUiLanguageByUserId(req.user!.id);
    res.json({ uiLanguage });
  } catch (error) {
    next(error);
  }
});

const patchPreferencesSchema = z.object({
  uiLanguage: z.enum(['en', 'uk']),
});

authRouter.patch('/me/preferences', requireAuth, async (req, res, next) => {
  try {
    const input = patchPreferencesSchema.parse(req.body);
    const uiLanguage = await authSQL.setUiLanguageByUserId(
      req.user!.id,
      input.uiLanguage
    );
    res.json({ uiLanguage });
  } catch (error) {
    next(error);
  }
});

import { Router } from 'express';
import * as authController from './auth.controller.js';
import { requireAuth } from '../../middlewares/requireAuth.js';

export const authRouter = Router();

authRouter.post('/register', authController.register);
authRouter.post('/login', authController.login);
authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ id: req.user!.id, username: req.user!.username });
});

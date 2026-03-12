import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';

export const authRouter = Router();

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({
    id: req.user!.id,
    email: req.user!.email,
    name: req.user!.name,
  });
});

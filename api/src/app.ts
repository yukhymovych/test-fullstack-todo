import express from 'express';
import cors from 'cors';
import { authRouter } from './modules/auth/auth.routes.js';
import { notesRouter } from './modules/notes/notes.routes.js';
import { learningRouter } from './modules/learning/learning.routes.js';
import { studyQuestionsAnswersRouter } from './modules/studyQuestionsAnswers/studyQuestionsAnswers.routes.js';
import { errorHandler } from './middlewares/errorHandler.js';

const webOrigin = process.env.CLIENT_ORIGIN;

if (!process.env.AUTH0_DOMAIN) {
  throw new Error('AUTH0_DOMAIN environment variable is not set');
}
if (!process.env.AUTH0_AUDIENCE) {
  throw new Error('AUTH0_AUDIENCE environment variable is not set');
}

export const app = express();

const allowedOrigin = (
  origin: string | undefined,
  cb: (err: Error | null, allow?: boolean) => void
) => {
  if (!origin) return cb(null, true);

  const ok =
    origin === 'http://localhost:5173' ||
    origin.startsWith('http://127.0.0.1:') ||
    origin.startsWith('http://192.168.') ||
    origin.startsWith('http://10.') ||
    origin === webOrigin;

  cb(null, ok);
};

app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  })
);

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/auth', authRouter);
app.use('/notes', notesRouter);
app.use('/learning', learningRouter);
app.use('/study-questions', studyQuestionsAnswersRouter);

app.use(errorHandler);

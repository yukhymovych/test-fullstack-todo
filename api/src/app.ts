import express from 'express';
import cors from 'cors';
import { authRouter } from './modules/auth/auth.routes.js';
import { notesRouter } from './modules/notes/notes.routes.js';
import { learningRouter } from './modules/learning/learning.routes.js';
import { studyQuestionsAnswersRouter } from './modules/studyQuestionsAnswers/studyQuestionsAnswers.routes.js';
import { remindersRouter } from './modules/reminders/reminders.routes.js';
import { backupRouter } from './modules/backup/backup.routes.js';
import { errorHandler } from './middlewares/errorHandler.js';

const webOrigin = process.env.CLIENT_ORIGIN;
const jsonBodyLimit = process.env.API_JSON_LIMIT ?? '2mb';
const backupJsonBodyLimit = process.env.API_BACKUP_JSON_LIMIT ?? '50mb';

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

app.use(express.json({ limit: jsonBodyLimit }));
app.use(express.urlencoded({ extended: true, limit: jsonBodyLimit }));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/auth', authRouter);
app.use('/notes', notesRouter);
app.use('/learning', learningRouter);
app.use('/study-questions', studyQuestionsAnswersRouter);
app.use('/reminders', remindersRouter);
app.use(
  '/backup',
  express.json({ limit: backupJsonBodyLimit }),
  express.urlencoded({ extended: true, limit: backupJsonBodyLimit }),
  backupRouter
);

app.use(errorHandler);

import express from 'express';
import cors from 'cors';
import { authRouter } from './modules/auth/auth.routes.js';
import { notesRouter } from './modules/notes/notes.routes.js';
import { todosRouter } from './modules/todos/todos.routes.js';
import { errorHandler } from './middlewares/errorHandler.js';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

export const app = express();

app.use(cors({
  origin: 'http://localhost:5173',
}));

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/auth', authRouter);
app.use('/notes', notesRouter);
app.use('/todos', todosRouter);

app.use(errorHandler);

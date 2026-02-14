import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import * as notesController from './notes.controller.js';

export const notesRouter = Router();

notesRouter.use(requireAuth);

notesRouter.get('/', notesController.getNotes);
notesRouter.get('/:id', notesController.getNote);
notesRouter.post('/', notesController.createNote);
notesRouter.put('/:id', notesController.updateNote);
notesRouter.delete('/:id', notesController.deleteNote);

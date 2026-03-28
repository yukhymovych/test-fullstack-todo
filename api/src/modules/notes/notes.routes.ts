import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import * as notesController from './notes.controller.js';
import * as studyQuestionsController from '../studyQuestionsAnswers/studyQuestionsAnswers.controller.js';

export const notesRouter = Router();

notesRouter.use(requireAuth);

notesRouter.get('/', notesController.getNotes);
notesRouter.get('/trash', notesController.getTrashNotes);
notesRouter.get('/trash/:id', notesController.getTrashNote);
notesRouter.get(
  '/:pageId/study-questions',
  studyQuestionsController.getPageStudyQuestions
);
notesRouter.post(
  '/:pageId/study-questions',
  studyQuestionsController.createManualStudyQuestion
);
notesRouter.post(
  '/:pageId/study-questions/generate',
  studyQuestionsController.generateStudyQuestions
);
notesRouter.get('/:id/embeds', notesController.getNoteEmbeds);
notesRouter.get('/:id', notesController.getNote);
notesRouter.post('/', notesController.createNote);
notesRouter.put('/:id', notesController.updateNote);
notesRouter.patch('/:id/move', notesController.moveNote);
notesRouter.patch('/:id/trash', notesController.deleteNote);
notesRouter.patch('/:id/restore', notesController.restoreNote);
notesRouter.patch('/:id/favorite', notesController.setNoteFavorite);
notesRouter.patch('/:id/visit', notesController.updateNoteLastVisited);
notesRouter.delete('/:id/permanent', notesController.permanentlyDeleteNote);
notesRouter.delete('/:id', notesController.deleteNote);

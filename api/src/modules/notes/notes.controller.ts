import { Request, Response, NextFunction } from 'express';
import * as notesService from './notes.service.js';
import {
  createNoteSchema,
  updateNoteSchema,
  moveNoteSchema,
  setFavoriteSchema,
  noteIdSchema,
  searchNotesQuerySchema,
} from './notes.schemas.js';

const DEFAULT_RICH_CONTENT = [{ type: 'paragraph', content: [] }];

export async function getNotes(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const notes = await notesService.getAllNotes(userId);
    res.json(notes);
  } catch (error) {
    next(error);
  }
}

export async function getTrashNotes(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const notes = await notesService.getAllTrashedNotes(userId);
    res.json(notes);
  } catch (error) {
    next(error);
  }
}

export async function getNote(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = noteIdSchema.parse(req.params.id);
    const note = await notesService.getNoteById(id, userId);

    if (!note) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    res.json(note);
  } catch (error) {
    next(error);
  }
}

export async function getTrashNote(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = noteIdSchema.parse(req.params.id);
    const note = await notesService.getTrashNoteById(id, userId);

    if (!note) {
      res.status(404).json({ error: 'Trash note not found' });
      return;
    }

    res.json(note);
  } catch (error) {
    next(error);
  }
}

export async function createNote(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const input = createNoteSchema.parse(req.body);
    const richContent = Array.isArray(input.rich_content)
      ? input.rich_content
      : DEFAULT_RICH_CONTENT;
    const title = (input.title && input.title.trim()) || 'Untitled';
    const note = await notesService.createNote(userId, {
      title,
      parent_id: input.parent_id ?? undefined,
      rich_content: richContent,
    });
    res.status(201).json(note);
  } catch (error) {
    next(error);
  }
}

export async function updateNote(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = noteIdSchema.parse(req.params.id);
    const input = updateNoteSchema.parse(req.body);
    const richContent = Array.isArray(input.rich_content)
      ? input.rich_content
      : undefined;

    if (richContent === undefined) {
      res.status(400).json({ error: 'rich_content is required' });
      return;
    }

    const note = await notesService.updateNote(id, userId, {
      title: input.title,
      parent_id: input.parent_id,
      rich_content: richContent,
    });

    if (!note) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    res.json(note);
  } catch (error) {
    next(error);
  }
}

export async function moveNote(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = noteIdSchema.parse(req.params.id);
    const input = moveNoteSchema.parse(req.body);
    const note = await notesService.moveNote(id, userId, input);
    if (!note) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }
    res.json(note);
  } catch (error) {
    next(error);
  }
}

export async function deleteNote(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = noteIdSchema.parse(req.params.id);
    const deleted = await notesService.deleteNote(id, userId);

    if (!deleted) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function restoreNote(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = noteIdSchema.parse(req.params.id);
    const restored = await notesService.restoreNote(id, userId);

    if (!restored) {
      res.status(404).json({ error: 'Trash note not found' });
      return;
    }

    res.json(restored);
  } catch (error) {
    next(error);
  }
}

export async function permanentlyDeleteNote(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = noteIdSchema.parse(req.params.id);
    const deleted = await notesService.permanentlyDeleteNote(id, userId);

    if (!deleted) {
      res.status(404).json({ error: 'Trash note not found' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function setNoteFavorite(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = noteIdSchema.parse(req.params.id);
    const input = setFavoriteSchema.parse(req.body);
    const note = await notesService.setNoteFavorite(id, userId, input);

    if (!note) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    res.json(note);
  } catch (error) {
    next(error);
  }
}

export async function updateNoteLastVisited(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = noteIdSchema.parse(req.params.id);
    const note = await notesService.updateNoteLastVisited(id, userId);

    if (!note) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    res.json(note);
  } catch (error) {
    next(error);
  }
}

export async function getNoteEmbeds(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = noteIdSchema.parse(req.params.id);
    const note = await notesService.getNoteById(id, userId);

    if (!note) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    const embeds = await notesService.getNoteEmbeds(id, userId);
    res.json(embeds);
  } catch (error) {
    next(error);
  }
}

export async function searchNotes(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.id;
    const query = searchNotesQuerySchema.parse(req.query);
    const results = await notesService.searchNotes(
      userId,
      query.q,
      query.limit,
      query.rootNoteId
    );
    res.json({ results });
  } catch (error) {
    next(error);
  }
}

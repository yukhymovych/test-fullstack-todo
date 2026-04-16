import { z } from 'zod';

export const createNoteSchema = z.object({
  title: z
    .string()
    .max(200)
    .transform((s) => s.trim())
    .optional()
    .default(''),
  parent_id: z.string().uuid().nullable().optional(),
  rich_content: z.array(z.unknown()).optional().default([]),
});

export const updateNoteSchema = z.object({
  title: z.string().max(200).transform((s) => s.trim()),
  parent_id: z.string().uuid().nullable().optional(),
  rich_content: z.array(z.unknown()),
});

export const noteIdSchema = z.string().uuid('Invalid note ID format');

export const moveNoteSchema = z.object({
  new_parent_id: z.string().uuid().nullable(),
  position: z.number().int().min(0).optional().default(0),
});

export const setFavoriteSchema = z.object({
  is_favorite: z.boolean(),
});

const trimmedSearchQuerySchema = z
  .string()
  .max(200)
  .transform((s) => s.trim())
  .refine((s) => s.length >= 2, {
    message: 'Search query must be at least 2 characters',
  });

export const searchNotesQuerySchema = z.object({
  q: trimmedSearchQuerySchema,
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  rootNoteId: z
    .union([z.string().uuid(), z.literal('')])
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type MoveNoteInput = z.infer<typeof moveNoteSchema>;
export type SetFavoriteInput = z.infer<typeof setFavoriteSchema>;
export type SearchNotesQueryInput = z.infer<typeof searchNotesQuerySchema>;

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

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type MoveNoteInput = z.infer<typeof moveNoteSchema>;

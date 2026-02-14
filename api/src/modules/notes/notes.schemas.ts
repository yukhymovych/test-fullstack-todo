import { z } from 'zod';

export const createNoteSchema = z.object({
  title: z
    .string()
    .max(200)
    .transform((s) => s.trim())
    .optional()
    .default(''),
  rich_content: z.array(z.unknown()).optional().default([]),
});

export const updateNoteSchema = z.object({
  title: z.string().max(200).transform((s) => s.trim()),
  rich_content: z.array(z.unknown()),
});

export const noteIdSchema = z.string().uuid('Invalid note ID format');

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;

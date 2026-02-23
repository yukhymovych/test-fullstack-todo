import { z } from 'zod';

export const gradeSchema = z.enum(['again', 'hard', 'good', 'easy']);
export type Grade = z.infer<typeof gradeSchema>;

export const startSessionSchema = z.object({
  timezone: z.string().max(64).optional().default('UTC'),
});

export const startScopedSessionSchema = z.object({
  scopePageId: z.string().uuid(),
  timezone: z.string().max(64).optional().default('UTC'),
});

export const gradeBodySchema = z.object({
  grade: gradeSchema,
});

export const gradeByPageBodySchema = z.object({
  pageId: z.string().uuid(),
  grade: gradeSchema,
});

export const studyItemStatusQuerySchema = z.object({
  pageId: z.string().uuid(),
});

export const activateBodySchema = z.object({
  pageId: z.string().uuid(),
});

export const activateScopedBodySchema = z.object({
  scopePageId: z.string().uuid(),
});

export const deactivateBodySchema = z.object({
  pageId: z.string().uuid(),
});

export const sessionItemIdSchema = z.string().uuid();

import { z } from 'zod';
import { BACKUP_FORMAT_ID, BACKUP_FORMAT_VERSION } from './backup.types.js';

const isoStringSchema = z
  .string()
  .min(1)
  .max(64)
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'Invalid ISO date',
  });

const backupNoteSchema = z.object({
  id: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  title: z.string().max(200),
  richContent: z.array(z.unknown()),
  sortOrder: z.number().int().min(0),
  isFavorite: z.boolean(),
  createdAt: isoStringSchema,
  updatedAt: isoStringSchema,
});

const backupQuestionAnswerSchema = z.object({
  id: z.string().uuid(),
  pageId: z.string().uuid(),
  question: z.string().min(1).max(2000),
  answer: z.string().min(1).max(4000),
  source: z.enum(['manual', 'generated']),
});

const backupStudyItemSchema = z.object({
  noteId: z.string().uuid(),
  isActive: z.boolean(),
  dueAt: isoStringSchema,
  lastReviewedAt: isoStringSchema.nullable(),
  stabilityDays: z.number().finite().min(0).max(10000),
  difficulty: z.number().finite().min(0).max(10),
});

export const backupDocumentSchema = z.object({
  format: z.literal(BACKUP_FORMAT_ID),
  version: z.literal(BACKUP_FORMAT_VERSION),
  exportedAt: isoStringSchema,
  scope: z.enum(['full', 'subtree']),
  rootNoteId: z.string().uuid().nullable(),
  data: z.object({
    notes: z.array(backupNoteSchema).max(20000),
    questionAnswers: z.array(backupQuestionAnswerSchema).max(100000),
    studyItems: z.array(backupStudyItemSchema).max(20000),
  }),
});

export const exportBackupQuerySchema = z.object({
  rootNoteId: z
    .union([z.string().uuid(), z.literal('')])
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export const importBackupBodySchema = z.object({
  document: backupDocumentSchema,
  preserveStudyState: z.boolean().optional().default(false),
});

export type ExportBackupQueryInput = z.infer<typeof exportBackupQuerySchema>;
export type ImportBackupBodyInput = z.infer<typeof importBackupBodySchema>;
export type BackupDocumentInput = z.infer<typeof backupDocumentSchema>;

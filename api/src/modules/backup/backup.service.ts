import { pool } from '../../db/pool.js';
import {
  extractContentText,
  extractEmbeddedNoteIds,
  remapEmbeddedNoteIdsInRichContent,
} from '../notes/notes.content.js';
import { replaceNoteEmbedsWithClient } from '../notes/noteEmbeds.sql.js';
import { normalizeStudyText } from '../studyQuestionsAnswers/studyQuestionsAnswers.service.js';
import * as backupSQL from './backup.sql.js';
import {
  buildIdMap,
  computeSortOrders,
  findDuplicateNoteIds,
  topologicallyOrderBackupNotes,
} from './backup.mappers.js';
import {
  BACKUP_FORMAT_ID,
  BACKUP_FORMAT_VERSION,
  type BackupDocument,
  type BackupNote,
  type BackupQuestionAnswer,
  type BackupStudyItem,
  type ExportBackupOptions,
  type ImportBackupOptions,
  type ImportBackupResult,
  type ImportBackupWarnings,
} from './backup.types.js';
import { buildStudyItemRow } from './backup.studyItem.js';
import { buildBackupDocument } from './backup.export.js';
import { fetchNoteRowsForScope as fetchNoteRowsForScopeWithDeps } from './backup.fetchScope.js';

interface ErrorWithStatusCode extends Error {
  statusCode?: number;
}

function createError(message: string, statusCode: number): ErrorWithStatusCode {
  const error = new Error(message) as ErrorWithStatusCode;
  error.statusCode = statusCode;
  return error;
}

export async function exportBackup(
  userId: string,
  options: ExportBackupOptions
): Promise<BackupDocument> {
  if (options.scope !== 'full') {
    if (!options.rootNoteId) {
      // Defense in depth: the schema already rejects this combination at the
      // controller boundary.
      throw createError(
        `rootNoteId is required when scope is "${options.scope}"`,
        400
      );
    }
    const exists = await backupSQL.noteExistsForUserNonTrashed(
      userId,
      options.rootNoteId
    );
    if (!exists) {
      throw createError('Root note not found', 404);
    }
  }

  const noteRows = await fetchNoteRowsForScope(userId, options);
  const noteIds = noteRows.map((n) => n.id);

  const [qaRows, studyItemRows] = await Promise.all([
    backupSQL.getQuestionAnswersForNotes(userId, noteIds),
    backupSQL.getStudyItemsForNotes(userId, noteIds),
  ]);

  return buildBackupDocument({
    scope: options.scope,
    rootNoteId: options.rootNoteId ?? null,
    noteRows,
    qaRows,
    studyItemRows,
    exportedAt: new Date().toISOString(),
  });
}

function fetchNoteRowsForScope(
  userId: string,
  options: ExportBackupOptions
) {
  return fetchNoteRowsForScopeWithDeps(
    {
      getAllOrSubtree: backupSQL.getNotesForBackup,
      getSingle: backupSQL.getSingleNoteForBackup,
    },
    userId,
    options
  );
}

interface PreparedNoteInsert {
  oldId: string;
  newId: string;
  newParentId: string | null;
  title: string;
  remappedRichContent: unknown[];
  contentText: string;
  sortOrder: number;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  embeddedNoteIds: string[];
}

interface PrepareNoteInsertsResult {
  prepared: PreparedNoteInsert[];
  skippedNoteCount: number;
  orphanDemotedCount: number;
  cycleDemotedCount: number;
  droppedEmbeddedReferences: number;
  malformedEmbeddedReferences: number;
}

function prepareNoteInserts(
  notes: BackupNote[],
  idMap: Map<string, string>
): PrepareNoteInsertsResult {
  const { ordered, demotedToRoot, orphanDemotedCount, cycleDemotedCount } =
    topologicallyOrderBackupNotes(notes);
  const sortOrderByOldId = computeSortOrders(
    ordered.map((n) => ({
      id: n.id,
      parentId: demotedToRoot.has(n.id) ? null : n.parentId,
    }))
  );

  let droppedEmbeddedReferences = 0;
  let malformedEmbeddedReferences = 0;

  const prepared: PreparedNoteInsert[] = [];
  for (const note of ordered) {
    const newId = idMap.get(note.id);
    if (!newId) continue;

    const effectiveParentId = demotedToRoot.has(note.id) ? null : note.parentId;
    const newParentId = effectiveParentId
      ? idMap.get(effectiveParentId) ?? null
      : null;

    const { richContent: remapped, stats } = remapEmbeddedNoteIdsInRichContent(
      note.richContent,
      idMap
    );
    droppedEmbeddedReferences += stats.droppedMissingTargetCount;
    malformedEmbeddedReferences += stats.droppedMalformedCount;
    const remappedRichContent = Array.isArray(remapped) ? remapped : [];

    prepared.push({
      oldId: note.id,
      newId,
      newParentId,
      title: note.title.trim() || 'Untitled',
      remappedRichContent,
      contentText: extractContentText(remappedRichContent),
      sortOrder: sortOrderByOldId.get(note.id) ?? 0,
      isFavorite: note.isFavorite,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      embeddedNoteIds: extractEmbeddedNoteIds(remappedRichContent),
    });
  }

  return {
    prepared,
    skippedNoteCount: notes.length - prepared.length,
    orphanDemotedCount,
    cycleDemotedCount,
    droppedEmbeddedReferences,
    malformedEmbeddedReferences,
  };
}


export async function importBackup(
  userId: string,
  document: BackupDocument,
  options: ImportBackupOptions
): Promise<ImportBackupResult> {
  if (document.format !== BACKUP_FORMAT_ID) {
    throw createError('Unsupported backup format', 400);
  }
  if (document.version !== BACKUP_FORMAT_VERSION) {
    throw createError(
      `Unsupported backup version: expected ${BACKUP_FORMAT_VERSION}`,
      400
    );
  }

  const duplicateNoteIds = findDuplicateNoteIds(document.data.notes);
  if (duplicateNoteIds.length > 0) {
    throw createError(
      'Backup file is invalid: duplicate note IDs found',
      400
    );
  }

  const idMap = buildIdMap(document.data.notes);
  const {
    prepared,
    skippedNoteCount,
    orphanDemotedCount,
    cycleDemotedCount,
    droppedEmbeddedReferences,
    malformedEmbeddedReferences,
  } = prepareNoteInserts(document.data.notes, idMap);

  const validQuestionAnswers: BackupQuestionAnswer[] = [];
  let skippedQuestionAnswerCount = 0;
  for (const qa of document.data.questionAnswers) {
    if (idMap.has(qa.pageId)) {
      validQuestionAnswers.push(qa);
    } else {
      skippedQuestionAnswerCount += 1;
    }
  }

  const validStudyItems: BackupStudyItem[] = [];
  const seenStudyItemNoteIds = new Set<string>();
  let skippedStudyItemCount = 0;
  for (const studyItem of document.data.studyItems) {
    if (!idMap.has(studyItem.noteId) || seenStudyItemNoteIds.has(studyItem.noteId)) {
      skippedStudyItemCount += 1;
      continue;
    }
    seenStudyItemNoteIds.add(studyItem.noteId);
    validStudyItems.push(studyItem);
  }

  const client = await pool.connect();
  let insertedNoteCount = 0;
  let insertedQuestionAnswerCount = 0;
  let insertedStudyItemCount = 0;

  try {
    await client.query('BEGIN');

    for (const note of prepared) {
      await backupSQL.insertNoteWithClient(client, {
        id: note.newId,
        userId,
        title: note.title,
        richContent: note.remappedRichContent,
        contentText: note.contentText,
        parentId: note.newParentId,
        sortOrder: note.sortOrder,
        isFavorite: note.isFavorite,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      });
      insertedNoteCount += 1;
    }

    // After all notes are inserted, rebuild note_embeds in the same transaction.
    // Embedded refs that point outside this user have already been pruned by the
    // remap step (orphan blocks dropped); embedded refs to other inserted notes
    // are now valid in DB.
    for (const note of prepared) {
      if (note.embeddedNoteIds.length === 0) continue;
      await replaceNoteEmbedsWithClient(
        client,
        userId,
        note.newId,
        note.embeddedNoteIds
      );
    }

    for (const qa of validQuestionAnswers) {
      const newPageId = idMap.get(qa.pageId);
      if (!newPageId) continue;
      const questionTrimmed = qa.question.trim();
      const answerTrimmed = qa.answer.trim();
      if (!questionTrimmed || !answerTrimmed) continue;
      const inserted = await backupSQL.insertStudyQuestionAnswerWithClient(client, {
        userId,
        pageId: newPageId,
        question: questionTrimmed,
        answer: answerTrimmed,
        source: qa.source,
        questionNormalized: normalizeStudyText(questionTrimmed),
        answerNormalized: normalizeStudyText(answerTrimmed),
      });
      if (inserted) insertedQuestionAnswerCount += 1;
    }

    const nowIso = new Date().toISOString();
    for (const studyItem of validStudyItems) {
      const newNoteId = idMap.get(studyItem.noteId);
      if (!newNoteId) continue;
      const row = buildStudyItemRow(studyItem, options, nowIso);
      const inserted = await backupSQL.insertStudyItemWithClient(client, {
        userId,
        noteId: newNoteId,
        isActive: row.isActive,
        dueAt: row.dueAt,
        lastReviewedAt: row.lastReviewedAt,
        stabilityDays: row.stabilityDays,
        difficulty: row.difficulty,
      });
      if (inserted) insertedStudyItemCount += 1;
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  const warnings: ImportBackupWarnings = {
    orphanNotesDemotedToRoot: orphanDemotedCount,
    cycleNotesDemotedToRoot: cycleDemotedCount,
    droppedEmbeddedReferences,
    malformedEmbeddedReferences,
  };

  return {
    insertedNoteCount,
    insertedQuestionAnswerCount,
    insertedStudyItemCount,
    skippedNoteCount,
    skippedQuestionAnswerCount,
    skippedStudyItemCount,
    warnings,
  };
}

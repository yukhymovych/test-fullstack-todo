import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBackupDocument } from './backup.export.js';
import {
  backupDocumentSchema,
  exportBackupQuerySchema,
} from './backup.schemas.js';
import type {
  NoteRowForBackup,
  QuestionAnswerRowForBackup,
  StudyItemRowForBackup,
} from './backup.mappers.js';

const FIXED_NOW = '2026-04-20T12:00:00.000Z';

function makeNoteRow(overrides: Partial<NoteRowForBackup>): NoteRowForBackup {
  return {
    id: overrides.id ?? '00000000-0000-4000-8000-000000000001',
    parent_id: overrides.parent_id ?? null,
    title: overrides.title ?? 'untitled',
    rich_content: overrides.rich_content ?? [],
    sort_order: overrides.sort_order ?? 0,
    is_favorite: overrides.is_favorite ?? false,
    created_at: overrides.created_at ?? new Date('2026-01-01T00:00:00.000Z'),
    updated_at: overrides.updated_at ?? new Date('2026-01-02T00:00:00.000Z'),
  };
}

function makeQaRow(overrides: Partial<QuestionAnswerRowForBackup>): QuestionAnswerRowForBackup {
  return {
    id: overrides.id ?? '00000000-0000-4000-8000-00000000aaaa',
    page_id: overrides.page_id ?? '00000000-0000-4000-8000-000000000001',
    question: overrides.question ?? 'Q?',
    answer: overrides.answer ?? 'A.',
    source: overrides.source ?? 'manual',
  };
}

function makeStudyItemRow(overrides: Partial<StudyItemRowForBackup>): StudyItemRowForBackup {
  return {
    note_id: overrides.note_id ?? '00000000-0000-4000-8000-000000000001',
    is_active: overrides.is_active ?? true,
    due_at: overrides.due_at ?? new Date('2026-05-01T00:00:00.000Z'),
    last_reviewed_at: overrides.last_reviewed_at ?? null,
    stability_days: overrides.stability_days ?? 7,
    difficulty: overrides.difficulty ?? 5,
  };
}

// ---------- buildBackupDocument: scope routing & envelope ----------

test('scope=single envelope: includes the one note + related Q/A + study_item', () => {
  const noteId = '00000000-0000-4000-8000-000000000010';
  const document = buildBackupDocument({
    scope: 'single',
    rootNoteId: noteId,
    noteRows: [makeNoteRow({ id: noteId })],
    qaRows: [makeQaRow({ page_id: noteId })],
    studyItemRows: [makeStudyItemRow({ note_id: noteId })],
    exportedAt: FIXED_NOW,
  });

  assert.equal(document.scope, 'single');
  assert.equal(document.rootNoteId, noteId);
  assert.equal(document.data.notes.length, 1);
  assert.equal(document.data.notes[0].id, noteId);
  assert.equal(document.data.questionAnswers.length, 1);
  assert.equal(document.data.studyItems.length, 1);
});

test('scope=single anchors a parented note to root via reanchorOrphanParents', () => {
  const noteId = '00000000-0000-4000-8000-000000000011';
  const externalParent = '00000000-0000-4000-8000-0000000000ff';
  const document = buildBackupDocument({
    scope: 'single',
    rootNoteId: noteId,
    noteRows: [makeNoteRow({ id: noteId, parent_id: externalParent })],
    qaRows: [],
    studyItemRows: [],
    exportedAt: FIXED_NOW,
  });

  assert.equal(document.data.notes[0].parentId, null);
});

test('scope=subtree envelope: includes only the supplied note rows in document.data.notes', () => {
  const root = '00000000-0000-4000-8000-000000000020';
  const child = '00000000-0000-4000-8000-000000000021';
  const document = buildBackupDocument({
    scope: 'subtree',
    rootNoteId: root,
    noteRows: [
      makeNoteRow({ id: root }),
      makeNoteRow({ id: child, parent_id: root }),
    ],
    qaRows: [makeQaRow({ page_id: child })],
    studyItemRows: [makeStudyItemRow({ note_id: root })],
    exportedAt: FIXED_NOW,
  });

  assert.equal(document.scope, 'subtree');
  assert.equal(document.rootNoteId, root);
  assert.deepEqual(
    document.data.notes.map((n) => n.id).sort(),
    [root, child].sort()
  );
  // No row outside what we passed in is invented:
  assert.equal(document.data.notes.length, 2);
  assert.equal(document.data.questionAnswers.length, 1);
  assert.equal(document.data.questionAnswers[0].pageId, child);
});

test('scope=subtree: child note keeps its in-scope parentId unchanged', () => {
  const root = '00000000-0000-4000-8000-000000000030';
  const child = '00000000-0000-4000-8000-000000000031';
  const document = buildBackupDocument({
    scope: 'subtree',
    rootNoteId: root,
    noteRows: [
      makeNoteRow({ id: root }),
      makeNoteRow({ id: child, parent_id: root }),
    ],
    qaRows: [],
    studyItemRows: [],
    exportedAt: FIXED_NOW,
  });

  const childDto = document.data.notes.find((n) => n.id === child)!;
  assert.equal(childDto.parentId, root);
});

test('scope=full envelope: rootNoteId is null even if a value is passed', () => {
  const document = buildBackupDocument({
    scope: 'full',
    rootNoteId: 'should-be-ignored',
    noteRows: [makeNoteRow({})],
    qaRows: [],
    studyItemRows: [],
    exportedAt: FIXED_NOW,
  });

  assert.equal(document.scope, 'full');
  assert.equal(document.rootNoteId, null);
});

test('format/version envelope is stable across scopes', () => {
  for (const scope of ['full', 'single', 'subtree'] as const) {
    const document = buildBackupDocument({
      scope,
      rootNoteId: scope === 'full' ? null : 'some-id',
      noteRows: [],
      qaRows: [],
      studyItemRows: [],
      exportedAt: FIXED_NOW,
    });

    assert.equal(document.format, 'rememo-backup');
    assert.equal(document.version, 1);
    assert.equal(document.exportedAt, FIXED_NOW);
  }
});

// ---------- exportBackupQuerySchema ----------

test('schema: scope=full needs no rootNoteId and defaults scope when omitted', () => {
  const parsed = exportBackupQuerySchema.parse({});
  assert.equal(parsed.scope, 'full');
  assert.equal(parsed.rootNoteId, undefined);
});

test('schema: scope=single requires rootNoteId', () => {
  assert.throws(() => exportBackupQuerySchema.parse({ scope: 'single' }), /rootNoteId/);
  assert.throws(
    () => exportBackupQuerySchema.parse({ scope: 'single', rootNoteId: '' }),
    /rootNoteId/
  );
});

test('schema: scope=subtree requires rootNoteId', () => {
  assert.throws(() => exportBackupQuerySchema.parse({ scope: 'subtree' }), /rootNoteId/);
});

test('schema: rejects invalid scope strings', () => {
  assert.throws(() =>
    exportBackupQuerySchema.parse({ scope: 'partial', rootNoteId: 'x' })
  );
});

test('schema: accepts scope=single with a valid uuid rootNoteId', () => {
  const parsed = exportBackupQuerySchema.parse({
    scope: 'single',
    rootNoteId: '00000000-0000-4000-8000-000000000099',
  });
  assert.equal(parsed.scope, 'single');
  assert.equal(parsed.rootNoteId, '00000000-0000-4000-8000-000000000099');
});

test('schema: accepts scope=subtree with a valid uuid rootNoteId', () => {
  const parsed = exportBackupQuerySchema.parse({
    scope: 'subtree',
    rootNoteId: '00000000-0000-4000-8000-000000000098',
  });
  assert.equal(parsed.scope, 'subtree');
});

// ---------- backupDocumentSchema (IMPORT side) ----------
//
// Regression guard: when "Page (JSON)" produces a document with scope='single',
// the import schema MUST accept it. Previously only ['full', 'subtree'] were
// allowed, which caused a 400 "Validation error" toast on restore.

function makeImportableDoc(scope: 'full' | 'single' | 'subtree') {
  return {
    format: 'rememo-backup',
    version: 1,
    exportedAt: FIXED_NOW,
    scope,
    rootNoteId:
      scope === 'full' ? null : '00000000-0000-4000-8000-000000000050',
    data: {
      notes: [
        {
          id: '00000000-0000-4000-8000-000000000050',
          parentId: null,
          title: 'root',
          richContent: [],
          sortOrder: 0,
          isFavorite: false,
          createdAt: FIXED_NOW,
          updatedAt: FIXED_NOW,
        },
      ],
      questionAnswers: [],
      studyItems: [],
    },
  };
}

test('import schema: accepts a document with scope=single', () => {
  const parsed = backupDocumentSchema.parse(makeImportableDoc('single'));
  assert.equal(parsed.scope, 'single');
});

test('import schema: accepts a document with scope=subtree', () => {
  const parsed = backupDocumentSchema.parse(makeImportableDoc('subtree'));
  assert.equal(parsed.scope, 'subtree');
});

test('import schema: accepts a document with scope=full', () => {
  const parsed = backupDocumentSchema.parse(makeImportableDoc('full'));
  assert.equal(parsed.scope, 'full');
});

test('import schema: rejects an unknown scope value', () => {
  assert.throws(() =>
    backupDocumentSchema.parse({
      ...makeImportableDoc('full'),
      scope: 'partial',
    })
  );
});

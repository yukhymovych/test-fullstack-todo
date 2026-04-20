import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStudyItemRow } from './backup.studyItem.js';
import type { BackupStudyItem } from './backup.types.js';

const sampleBackup: BackupStudyItem = {
  noteId: 'note-1',
  isActive: false,
  dueAt: '2026-06-15T00:00:00.000Z',
  lastReviewedAt: '2026-06-01T00:00:00.000Z',
  stabilityDays: 42,
  difficulty: 7.5,
};

test('preserveStudyState=false resets to FSRS-light defaults', () => {
  const nowIso = '2026-04-20T12:00:00.000Z';

  const row = buildStudyItemRow(sampleBackup, { preserveStudyState: false }, nowIso);

  assert.equal(row.isActive, true);
  assert.equal(row.dueAt, nowIso);
  assert.equal(row.lastReviewedAt, null);
  assert.equal(row.stabilityDays, 7);
  assert.equal(row.difficulty, 5);
});

test('preserveStudyState=true copies backup values verbatim', () => {
  const nowIso = '2026-04-20T12:00:00.000Z';

  const row = buildStudyItemRow(sampleBackup, { preserveStudyState: true }, nowIso);

  assert.equal(row.isActive, false);
  assert.equal(row.dueAt, '2026-06-15T00:00:00.000Z');
  assert.equal(row.lastReviewedAt, '2026-06-01T00:00:00.000Z');
  assert.equal(row.stabilityDays, 42);
  assert.equal(row.difficulty, 7.5);
});

test('preserveStudyState=true preserves null lastReviewedAt', () => {
  const row = buildStudyItemRow(
    { ...sampleBackup, lastReviewedAt: null },
    { preserveStudyState: true },
    '2026-04-20T12:00:00.000Z'
  );

  assert.equal(row.lastReviewedAt, null);
});

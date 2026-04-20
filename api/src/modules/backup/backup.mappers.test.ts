import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findDuplicateNoteIds,
  topologicallyOrderBackupNotes,
} from './backup.mappers.js';
import type { BackupNote } from './backup.types.js';

function makeNote(id: string, parentId: string | null, sortOrder = 0): BackupNote {
  return {
    id,
    parentId,
    title: id,
    richContent: [],
    sortOrder,
    isFavorite: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

test('findDuplicateNoteIds returns every repeated id in first-encounter order', () => {
  const duplicates = findDuplicateNoteIds([
    { id: 'a' },
    { id: 'b' },
    { id: 'a' },
    { id: 'c' },
    { id: 'b' },
    { id: 'a' },
  ]);

  assert.deepEqual(duplicates, ['a', 'b']);
});

test('findDuplicateNoteIds returns empty array when all ids are unique', () => {
  const duplicates = findDuplicateNoteIds([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);

  assert.deepEqual(duplicates, []);
});

test('topologically ordered list emits every parent before its children', () => {
  const notes: BackupNote[] = [
    makeNote('child-1', 'root-1'),
    makeNote('grand-1', 'child-1'),
    makeNote('root-1', null),
    makeNote('root-2', null),
    makeNote('child-2', 'root-2'),
  ];

  const { ordered } = topologicallyOrderBackupNotes(notes);
  const indexOf = (id: string) => ordered.findIndex((n) => n.id === id);

  assert.ok(indexOf('root-1') < indexOf('child-1'));
  assert.ok(indexOf('child-1') < indexOf('grand-1'));
  assert.ok(indexOf('root-2') < indexOf('child-2'));
  assert.equal(ordered.length, notes.length);
});

test('note with missing parent is counted as orphan and placed at top level', () => {
  const notes: BackupNote[] = [
    makeNote('root-1', null),
    makeNote('orphan', 'missing-parent'),
  ];

  const { ordered, orphanDemotedCount, cycleDemotedCount, demotedToRoot } =
    topologicallyOrderBackupNotes(notes);

  assert.equal(orphanDemotedCount, 1);
  assert.equal(cycleDemotedCount, 0);
  assert.equal(demotedToRoot.has('orphan'), false);
  assert.ok(ordered.some((n) => n.id === 'orphan'));
});

test('two-node cycle is broken: both members demoted to root and counted as cycle', () => {
  const notes: BackupNote[] = [
    makeNote('a', 'b'),
    makeNote('b', 'a'),
  ];

  const { ordered, orphanDemotedCount, cycleDemotedCount, demotedToRoot } =
    topologicallyOrderBackupNotes(notes);

  assert.equal(orphanDemotedCount, 0);
  assert.equal(cycleDemotedCount, 2);
  assert.equal(demotedToRoot.has('a'), true);
  assert.equal(demotedToRoot.has('b'), true);
  const emitted = ordered.filter((n) => n.id === 'a' || n.id === 'b');
  assert.equal(emitted.length, 2);
  for (const n of emitted) assert.equal(n.parentId, null);
});

test('self-parent is counted as cycle, not as orphan', () => {
  const notes: BackupNote[] = [
    makeNote('root', null),
    makeNote('self', 'self'),
  ];

  const { orphanDemotedCount, cycleDemotedCount, demotedToRoot } =
    topologicallyOrderBackupNotes(notes);

  assert.equal(orphanDemotedCount, 0);
  assert.equal(cycleDemotedCount, 1);
  assert.equal(demotedToRoot.has('self'), true);
});

test('mixed: orphan and cycle are counted independently', () => {
  const notes: BackupNote[] = [
    makeNote('orphan', 'missing'),
    makeNote('cycle-a', 'cycle-b'),
    makeNote('cycle-b', 'cycle-a'),
    makeNote('root', null),
  ];

  const { orphanDemotedCount, cycleDemotedCount } =
    topologicallyOrderBackupNotes(notes);

  assert.equal(orphanDemotedCount, 1);
  assert.equal(cycleDemotedCount, 2);
});

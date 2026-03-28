import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTrashSubtreeNoteIds,
  getTrashExpiryCutoff,
  resolveRestoreParentId,
} from './trash.logic.js';

test('subtree trash includes root and descendant ids once', () => {
  const ids = buildTrashSubtreeNoteIds('root-1', ['child-1', 'child-2', 'root-1']);

  assert.deepEqual(ids, ['root-1', 'child-1', 'child-2']);
});

test('restoring child subtree goes to root when original parent is still trashed', () => {
  const parentId = resolveRestoreParentId('parent-1', {
    id: 'parent-1',
    trashed_at: new Date('2026-03-01T00:00:00.000Z'),
  });

  assert.equal(parentId, null);
});

test('restoring subtree keeps original parent when parent is active', () => {
  const parentId = resolveRestoreParentId('parent-1', {
    id: 'parent-1',
    trashed_at: null,
  });

  assert.equal(parentId, 'parent-1');
});

test('lazy expiry cutoff removes trash older than ten days', () => {
  const now = new Date('2026-03-28T12:00:00.000Z');
  const cutoff = getTrashExpiryCutoff(now, 10);

  assert.equal(cutoff.toISOString(), '2026-03-18T12:00:00.000Z');
});

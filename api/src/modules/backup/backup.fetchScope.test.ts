import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchNoteRowsForScope,
  type FetchNotesByScopeDeps,
} from './backup.fetchScope.js';
import type { NoteRowForBackup } from './backup.mappers.js';

const USER_ID = '00000000-0000-4000-8000-0000000000aa';
const ROOT_ID = '00000000-0000-4000-8000-0000000000bb';

function makeRow(id: string, parentId: string | null = null): NoteRowForBackup {
  return {
    id,
    parent_id: parentId,
    title: 't',
    rich_content: [],
    sort_order: 0,
    is_favorite: false,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: new Date('2026-01-02T00:00:00.000Z'),
  };
}

/**
 * Build a deps pair that records every call and can return fixed rows.
 *
 * The test DOUBLE for `getAllOrSubtree` deliberately returns a subtree
 * (root + children) whenever it is called. If the routing dispatches
 * `scope=single` to the wrong helper, the test will observe children
 * in the output and fail loudly — which is the exact regression the
 * bug report describes.
 */
function makeDeps(): {
  deps: FetchNotesByScopeDeps;
  calls: {
    getAllOrSubtree: { userId: string; rootNoteId?: string }[];
    getSingle: { userId: string; noteId: string }[];
  };
} {
  const calls = {
    getAllOrSubtree: [] as { userId: string; rootNoteId?: string }[],
    getSingle: [] as { userId: string; noteId: string }[],
  };

  const deps: FetchNotesByScopeDeps = {
    getAllOrSubtree: async (userId, rootNoteId) => {
      calls.getAllOrSubtree.push({ userId, rootNoteId });
      return [
        makeRow(ROOT_ID),
        makeRow('00000000-0000-4000-8000-0000000000c1', ROOT_ID),
        makeRow('00000000-0000-4000-8000-0000000000c2', ROOT_ID),
      ];
    },
    getSingle: async (userId, noteId) => {
      calls.getSingle.push({ userId, noteId });
      return [makeRow(noteId)];
    },
  };

  return { deps, calls };
}

test('scope=single calls getSingle only and never getAllOrSubtree', async () => {
  const { deps, calls } = makeDeps();

  const rows = await fetchNoteRowsForScope(deps, USER_ID, {
    scope: 'single',
    rootNoteId: ROOT_ID,
  });

  assert.equal(calls.getSingle.length, 1);
  assert.deepEqual(calls.getSingle[0], { userId: USER_ID, noteId: ROOT_ID });
  assert.equal(
    calls.getAllOrSubtree.length,
    0,
    'scope=single must not touch the subtree query'
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, ROOT_ID);
});

test('scope=single returns exactly one row even if the selected note has children', async () => {
  const { deps } = makeDeps();

  const rows = await fetchNoteRowsForScope(deps, USER_ID, {
    scope: 'single',
    rootNoteId: ROOT_ID,
  });

  // The DOUBLE of getAllOrSubtree would have returned 3 rows
  // (root + 2 children). If scope=single were ever routed to it,
  // we'd see more than one row here. This is the regression guard
  // for the "Page (JSON) exports descendants" bug.
  assert.equal(rows.length, 1);
  assert.equal(rows[0].parent_id, null);
});

test('scope=subtree calls getAllOrSubtree with the rootNoteId', async () => {
  const { deps, calls } = makeDeps();

  const rows = await fetchNoteRowsForScope(deps, USER_ID, {
    scope: 'subtree',
    rootNoteId: ROOT_ID,
  });

  assert.equal(calls.getAllOrSubtree.length, 1);
  assert.deepEqual(calls.getAllOrSubtree[0], {
    userId: USER_ID,
    rootNoteId: ROOT_ID,
  });
  assert.equal(calls.getSingle.length, 0);
  // root + descendants from the DOUBLE
  assert.equal(rows.length, 3);
  assert.ok(rows.some((r) => r.id === ROOT_ID));
});

test('scope=full calls getAllOrSubtree with NO rootNoteId', async () => {
  const { deps, calls } = makeDeps();

  await fetchNoteRowsForScope(deps, USER_ID, { scope: 'full' });

  assert.equal(calls.getAllOrSubtree.length, 1);
  assert.equal(calls.getAllOrSubtree[0].userId, USER_ID);
  assert.equal(
    calls.getAllOrSubtree[0].rootNoteId,
    undefined,
    'full export must not pass a rootNoteId'
  );
  assert.equal(calls.getSingle.length, 0);
});

test('scope=single without rootNoteId throws (defense in depth)', async () => {
  const { deps } = makeDeps();

  await assert.rejects(
    () =>
      fetchNoteRowsForScope(deps, USER_ID, {
        scope: 'single',
        rootNoteId: undefined,
      }),
    /rootNoteId is required when scope is "single"/
  );
});

test('scope=subtree without rootNoteId throws (defense in depth)', async () => {
  const { deps } = makeDeps();

  await assert.rejects(
    () =>
      fetchNoteRowsForScope(deps, USER_ID, {
        scope: 'subtree',
        rootNoteId: undefined,
      }),
    /rootNoteId is required when scope is "subtree"/
  );
});

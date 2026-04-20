import test from 'node:test';
import assert from 'node:assert/strict';
import { remapEmbeddedNoteIdsInRichContent } from './notes.content.js';

function makeEmbed(noteId: unknown, extra: Record<string, unknown> = {}) {
  return {
    type: 'embeddedPage',
    props: { noteId },
    ...extra,
  };
}

test('embeddedPage with in-scope target is rewritten and block is kept', () => {
  const idMap = new Map<string, string>([['old-1', 'new-1']]);
  const input = [makeEmbed('old-1')];

  const { richContent, stats } = remapEmbeddedNoteIdsInRichContent(input, idMap);

  assert.equal(Array.isArray(richContent), true);
  const out = richContent as Array<{ type: string; props: { noteId: string } }>;
  assert.equal(out.length, 1);
  assert.equal(out[0].type, 'embeddedPage');
  assert.equal(out[0].props.noteId, 'new-1');
  assert.equal(stats.droppedMissingTargetCount, 0);
  assert.equal(stats.droppedMalformedCount, 0);
});

test('embeddedPage with out-of-scope target is dropped and counted as missing', () => {
  const idMap = new Map<string, string>([['old-1', 'new-1']]);
  const input = [
    makeEmbed('old-1'),
    makeEmbed('outside'),
    { type: 'paragraph', content: [{ type: 'text', text: 'keep me' }] },
  ];

  const { richContent, stats } = remapEmbeddedNoteIdsInRichContent(input, idMap);

  const out = richContent as Array<{ type: string }>;
  assert.equal(out.length, 2);
  assert.equal(out[0].type, 'embeddedPage');
  assert.equal(out[1].type, 'paragraph');
  assert.equal(stats.droppedMissingTargetCount, 1);
  assert.equal(stats.droppedMalformedCount, 0);
});

test('nested embeddedPage inside another block children is remapped', () => {
  const idMap = new Map<string, string>([
    ['old-1', 'new-1'],
    ['old-2', 'new-2'],
  ]);
  const input = [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'hi' }],
      children: [makeEmbed('old-1'), makeEmbed('old-2')],
    },
  ];

  const { richContent, stats } = remapEmbeddedNoteIdsInRichContent(input, idMap);
  const out = richContent as Array<{
    type: string;
    children: Array<{ type: string; props: { noteId: string } }>;
  }>;

  assert.equal(out[0].children.length, 2);
  assert.equal(out[0].children[0].props.noteId, 'new-1');
  assert.equal(out[0].children[1].props.noteId, 'new-2');
  assert.equal(stats.droppedMissingTargetCount, 0);
  assert.equal(stats.droppedMalformedCount, 0);
});

test('malformed embeddedPage blocks are dropped and counted as malformed', () => {
  const idMap = new Map<string, string>([['old-1', 'new-1']]);
  const input = [
    makeEmbed(undefined),
    makeEmbed(''),
    makeEmbed(123 as unknown),
    makeEmbed('old-1'),
  ];

  const { richContent, stats } = remapEmbeddedNoteIdsInRichContent(input, idMap);
  const out = richContent as Array<{ props: { noteId: string } }>;

  assert.equal(out.length, 1);
  assert.equal(out[0].props.noteId, 'new-1');
  assert.equal(stats.droppedMalformedCount, 3);
  assert.equal(stats.droppedMissingTargetCount, 0);
});

test('missing and malformed counters accumulate independently across nested arrays', () => {
  const idMap = new Map<string, string>([['known', 'remapped']]);
  const input = [
    makeEmbed('unknown-1'),
    {
      type: 'paragraph',
      children: [makeEmbed(''), makeEmbed('unknown-2'), makeEmbed('known')],
    },
  ];

  const { stats } = remapEmbeddedNoteIdsInRichContent(input, idMap);

  assert.equal(stats.droppedMissingTargetCount, 2);
  assert.equal(stats.droppedMalformedCount, 1);
});

test('original input is not mutated', () => {
  const idMap = new Map<string, string>([['old-1', 'new-1']]);
  const embed = makeEmbed('old-1');
  const input = [embed];
  const snapshot = JSON.parse(JSON.stringify(input));

  remapEmbeddedNoteIdsInRichContent(input, idMap);

  assert.deepEqual(input, snapshot);
});

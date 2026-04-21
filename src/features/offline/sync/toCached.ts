import type {
  AccountKey,
  CachedNote,
  CachedQA,
  CachedStudyItem,
} from '../domain/offline.types';
import { extractPlainText } from '../domain/extractPlainText';
import { estimateNoteBytes } from '../domain/sizeEstimator';
import { normalizeSearchText } from '@/features/search/model/searchTokenization';
import type {
  OfflineNoteDto,
  OfflineQaDto,
  OfflineStudyItemDto,
} from './offlineApi';

export function toCachedNote(
  accountKey: AccountKey,
  dto: OfflineNoteDto
): CachedNote {
  const plain =
    typeof dto.content_text === 'string' && dto.content_text.length > 0
      ? dto.content_text
      : extractPlainText(dto.rich_content);
  return {
    accountKey,
    id: dto.id,
    parent_id: dto.parent_id,
    title: dto.title,
    title_lc: normalizeSearchText(dto.title),
    rich_content: dto.rich_content,
    plain_text: plain,
    plain_text_lc: normalizeSearchText(plain),
    sort_order: dto.sort_order,
    is_favorite: dto.is_favorite,
    last_visited_at: dto.last_visited_at,
    created_at: dto.created_at,
    updated_at: dto.updated_at,
    byte_size: estimateNoteBytes({ title: dto.title, plainText: plain }),
  };
}

export function toCachedQa(
  accountKey: AccountKey,
  dto: OfflineQaDto
): CachedQA {
  return {
    accountKey,
    id: dto.id,
    page_id: dto.page_id,
    question: dto.question,
    answer: dto.answer,
    source: dto.source,
    created_at: dto.created_at,
    updated_at: dto.updated_at,
  };
}

export function toCachedStudy(
  accountKey: AccountKey,
  dto: OfflineStudyItemDto
): CachedStudyItem {
  return {
    accountKey,
    noteId: dto.note_id,
    status: dto.is_active ? 'active' : 'inactive',
    dueAt: dto.due_at,
    lastReviewedAt: dto.last_reviewed_at,
    stabilityDays: dto.stability_days,
    difficulty: dto.difficulty,
  };
}

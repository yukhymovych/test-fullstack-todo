import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Spinner } from '@/shared/ui';
import { RiDeleteBinLine, RiPencilLine } from 'react-icons/ri';
import {
  useStudyQuestions,
  useCreateStudyQuestion,
  useUpdateStudyQuestion,
  useDeleteStudyQuestion,
  useGenerateStudyQuestions,
  useIsGeneratingStudyQuestions,
} from '../../model/useStudyQuestions';
import type { StudyQuestionAnswer } from '../../domain/studyQuestions.types';
import type { StudyQuestionsAnswersBlockProps } from './StudyQuestionsAnswersBlock.types';
import { showToast } from '@/shared/lib/toast';
import './StudyQuestionsAnswersBlock.css';

interface DraftState {
  question: string;
  answer: string;
}

const EMPTY_DRAFT: DraftState = { question: '', answer: '' };

export function StudyQuestionsAnswersBlock({
  pageId,
  readOnly = false,
}: StudyQuestionsAnswersBlockProps) {
  const { t } = useTranslation('study');
  const { data: pairs = [], isLoading } = useStudyQuestions(pageId);
  const createMutation = useCreateStudyQuestion(pageId);
  const updateMutation = useUpdateStudyQuestion(pageId);
  const deleteMutation = useDeleteStudyQuestion(pageId);
  const generateMutation = useGenerateStudyQuestions(pageId);
  const isGenerating = useIsGeneratingStudyQuestions(pageId);

  const [newDraft, setNewDraft] = useState<DraftState>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DraftState>(EMPTY_DRAFT);

  const isBusy =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    isGenerating;

  const sortedPairs = useMemo(
    () =>
      [...pairs].sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
    [pairs]
  );

  const startEdit = (pair: StudyQuestionAnswer) => {
    setEditingId(pair.id);
    setEditDraft({ question: pair.question, answer: pair.answer });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(EMPTY_DRAFT);
  };

  const submitNew = async () => {
    const question = newDraft.question.trim();
    const answer = newDraft.answer.trim();
    if (!question || !answer) return;
    try {
      await createMutation.mutateAsync({ question, answer });
      setNewDraft(EMPTY_DRAFT);
    } catch {
      // handled by generic error boundaries/toasts in app
    }
  };

  const submitEdit = async () => {
    if (!editingId) return;
    const question = editDraft.question.trim();
    const answer = editDraft.answer.trim();
    if (!question || !answer) return;
    try {
      await updateMutation.mutateAsync({ id: editingId, body: { question, answer } });
      cancelEdit();
    } catch {
      // handled by generic error boundaries/toasts in app
    }
  };

  const removePair = async (id: string) => {
    if (!window.confirm(t('confirmDelete'))) return;
    await deleteMutation.mutateAsync(id);
  };

  const generateForPage = async () => {
    showToast(t('toasts.started'));
    try {
      const created = await generateMutation.mutateAsync({});
      if (created.length > 0) {
        showToast(t('toasts.completed'));
      }
    } catch {
      // handled by generic error boundaries/toasts in app
    }
  };

  if (readOnly && sortedPairs.length === 0) {
    return null;
  }

  return (
    <section className="study-qa-block">
      <div className="study-qa-block__header">
        <h3 className="study-qa-block__title">{t('sectionTitle')}</h3>
        {!readOnly ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={generateForPage}
            disabled={isBusy}
          >
            {isGenerating ? (
              <>
                <Spinner announce={false} size="sm" />
                <span className="sr-only">{t('creating')}</span>
              </>
            ) : (
              t('createWithAi')
            )}
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="study-qa-block__fetching">
          <Spinner size="sm" aria-label={t('loading')} />
        </div>
      ) : null}

      {!readOnly && isGenerating ? (
        <div className="study-qa-block__loader" aria-live="polite">
          <Spinner aria-label={t('creatingLoader')} />
        </div>
      ) : null}
      {!readOnly && !isGenerating ? (
        <div className="study-qa-block__create">
          <input
            className="study-qa-block__input"
            placeholder={t('questionPlaceholder')}
            value={newDraft.question}
            onChange={(event) =>
              setNewDraft((prev) => ({ ...prev, question: event.target.value }))
            }
          />
          <textarea
            className="study-qa-block__textarea"
            placeholder={t('answerPlaceholder')}
            value={newDraft.answer}
            onChange={(event) =>
              setNewDraft((prev) => ({ ...prev, answer: event.target.value }))
            }
            rows={3}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={submitNew}
            disabled={isBusy}
          >
            {t('createManual')}
          </Button>
        </div>
      ) : null}

      <div className="study-qa-block__list">
        {sortedPairs.map((pair) => {
          const isEditing = !readOnly && editingId === pair.id;
          return (
            <article key={pair.id} className="study-qa-block__item">
              {isEditing ? (
                <>
                  <input
                    className="study-qa-block__input"
                    value={editDraft.question}
                    onChange={(event) =>
                      setEditDraft((prev) => ({ ...prev, question: event.target.value }))
                    }
                  />
                  <textarea
                    className="study-qa-block__textarea"
                    value={editDraft.answer}
                    onChange={(event) =>
                      setEditDraft((prev) => ({ ...prev, answer: event.target.value }))
                    }
                    rows={3}
                  />
                  <div className="study-qa-block__actions">
                    <Button size="sm" onClick={submitEdit} disabled={isBusy}>
                      {t('save')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={cancelEdit}
                      disabled={isBusy}
                    >
                      {t('cancel')}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="study-qa-block__item-header">
                    <p className="study-qa-block__question">{pair.question}</p>
                    {!readOnly ? (
                      <div className="study-qa-block__icon-actions">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => startEdit(pair)}
                          disabled={isBusy}
                          aria-label={t('editAria')}
                          title={t('editTitle')}
                        >
                          <RiPencilLine />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removePair(pair.id)}
                          disabled={isBusy}
                          aria-label={t('deleteAria')}
                          title={t('deleteTitle')}
                          className="study-qa-block__delete-icon-btn"
                        >
                          <RiDeleteBinLine />
                        </Button>
                      </div>
                    ) : null}
                  </div>
                  <p className="study-qa-block__answer">{pair.answer}</p>
                </>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

import { useMemo, useState } from 'react';
import { Button } from '@/shared/ui';
import { RiDeleteBinLine, RiPencilLine } from 'react-icons/ri';
import {
  useStudyQuestions,
  useCreateStudyQuestion,
  useUpdateStudyQuestion,
  useDeleteStudyQuestion,
  useGenerateStudyQuestions,
} from '../../model/useStudyQuestions';
import type { StudyQuestionAnswer } from '../../domain/studyQuestions.types';
import type { StudyQuestionsAnswersBlockProps } from './StudyQuestionsAnswersBlock.types';
import './StudyQuestionsAnswersBlock.css';

interface DraftState {
  question: string;
  answer: string;
}

const EMPTY_DRAFT: DraftState = { question: '', answer: '' };

export function StudyQuestionsAnswersBlock({ pageId }: StudyQuestionsAnswersBlockProps) {
  const { data: pairs = [], isLoading } = useStudyQuestions(pageId);
  const createMutation = useCreateStudyQuestion(pageId);
  const updateMutation = useUpdateStudyQuestion(pageId);
  const deleteMutation = useDeleteStudyQuestion(pageId);
  const generateMutation = useGenerateStudyQuestions(pageId);

  const [newDraft, setNewDraft] = useState<DraftState>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DraftState>(EMPTY_DRAFT);

  const isBusy =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    generateMutation.isPending;

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
    if (!window.confirm('Delete this question-answer pair?')) return;
    await deleteMutation.mutateAsync(id);
  };

  return (
    <section className="study-qa-block">
      <div className="study-qa-block__header">
        <h3 className="study-qa-block__title">Questions and Answers</h3>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => generateMutation.mutate()}
          disabled={isBusy}
        >
          Generate Q/A with AI
        </Button>
      </div>

      {isLoading ? <p className="study-qa-block__hint">Loading questions...</p> : null}

      <div className="study-qa-block__create">
        <input
          className="study-qa-block__input"
          placeholder="Question"
          value={newDraft.question}
          onChange={(event) =>
            setNewDraft((prev) => ({ ...prev, question: event.target.value }))
          }
        />
        <textarea
          className="study-qa-block__textarea"
          placeholder="Answer"
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
          Create new Q/A
        </Button>
      </div>

      <div className="study-qa-block__list">
        {sortedPairs.map((pair) => {
          const isEditing = editingId === pair.id;
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
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={cancelEdit}
                      disabled={isBusy}
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="study-qa-block__item-header">
                    <p className="study-qa-block__question">{pair.question}</p>
                    <div className="study-qa-block__icon-actions">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => startEdit(pair)}
                        disabled={isBusy}
                        aria-label="Edit question and answer"
                        title="Edit"
                      >
                        <RiPencilLine />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removePair(pair.id)}
                        disabled={isBusy}
                        aria-label="Delete question and answer"
                        title="Delete"
                        className="study-qa-block__delete-icon-btn"
                      >
                        <RiDeleteBinLine />
                      </Button>
                    </div>
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

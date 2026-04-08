import { LearningGradeBar } from './LearningGradeBar';
import { useStudyItemStatus } from '../model/useStudyItemStatus';
import { useSubmitGradeByPage } from '../model/useSubmitLearningGrade';
import type { Grade } from '../domain/learning.types';
import { useTranslation } from 'react-i18next';
import './LearningGradeBar.css';

export interface NoteEditorLearningGradeBarProps {
  noteId: string;
}

export function NoteEditorLearningGradeBar({ noteId }: NoteEditorLearningGradeBarProps) {
  const { t } = useTranslation('learning');
  const { data: status } = useStudyItemStatus(noteId);
  const submitGrade = useSubmitGradeByPage();

  if (status?.status !== 'active') return null;

  const studiedToday =
    status.gradedToday ||
    (status.inTodaySession && status.sessionItemState === 'done');

  if (studiedToday) {
    return (
      <div className="note-editor-learning-grade-bar note-editor-learning-grade-bar--studied">
        {t('page.studiedTodayAlready')}
      </div>
    );
  }

  const handleGrade = (grade: Grade) => {
    if (submitGrade.isPending) return;
    submitGrade.mutate({ pageId: noteId, grade });
  };

  return (
    <div className="note-editor-learning-grade-bar">
      <LearningGradeBar
        onGrade={handleGrade}
        disabled={submitGrade.isPending}
      />
    </div>
  );
}

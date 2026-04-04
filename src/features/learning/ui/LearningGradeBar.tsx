import { cn } from '@/lib/utils';
import { Button } from '@/shared/ui';
import { useTranslation } from 'react-i18next';
import type { Grade } from '../domain/learning.types';
import { GRADE_BUTTON_STYLES, getGradeLabel } from '../lib/gradePresentation';

export interface LearningGradeBarProps {
  onGrade: (grade: Grade) => void;
  disabled?: boolean;
}

export function LearningGradeBar({ onGrade, disabled }: LearningGradeBarProps) {
  const grades: Grade[] = ['again', 'hard', 'good', 'easy'];
  const { t } = useTranslation('learning');

  return (
    <div className="learning-grade-bar">
      {grades.map((grade) => (
        <Button
          key={grade}
          variant="ghost"
          size="sm"
          onClick={() => onGrade(grade)}
          disabled={disabled}
          className={cn('learning-grade-bar__btn', GRADE_BUTTON_STYLES[grade])}
        >
          {getGradeLabel(t, grade)}
        </Button>
      ))}
    </div>
  );
}

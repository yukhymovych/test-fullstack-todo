import { cn } from '@/lib/utils';
import { Button } from '@/shared/ui';
import type { Grade } from '../domain/learning.types';
import { GRADE_BUTTON_STYLES, GRADE_LABELS } from '../lib/gradePresentation';

export interface LearningGradeBarProps {
  onGrade: (grade: Grade) => void;
  disabled?: boolean;
}

export function LearningGradeBar({ onGrade, disabled }: LearningGradeBarProps) {
  const grades: Grade[] = ['again', 'hard', 'good', 'easy'];

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
          {GRADE_LABELS[grade]}
        </Button>
      ))}
    </div>
  );
}

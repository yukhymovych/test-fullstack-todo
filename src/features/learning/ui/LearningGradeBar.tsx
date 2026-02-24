import { cn } from '@/lib/utils';
import { Button } from '@/shared/ui';
import type { Grade } from '../domain/learning.types';

const GRADE_LABELS: Record<Grade, string> = {
  again: 'Again',
  hard: 'Hard',
  good: 'Good',
  easy: 'Easy',
};

const GRADE_STYLES: Record<Grade, string> = {
  again: 'bg-red-500 text-white hover:bg-red-600 border-0',
  hard: 'bg-orange-400 text-white hover:bg-orange-600 border-0',
  good: 'bg-green-400 text-white hover:bg-green-600 border-0',
  easy: 'bg-blue-400 text-white hover:bg-blue-600 border-0',
};

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
          className={cn('learning-grade-bar__btn', GRADE_STYLES[grade])}
        >
          {GRADE_LABELS[grade]}
        </Button>
      ))}
    </div>
  );
}

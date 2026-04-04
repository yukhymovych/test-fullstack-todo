import type { Grade } from '../domain/learning.types';
import type { TFunction } from 'i18next';

export function getGradeLabel(t: TFunction, grade: Grade): string {
  return t(`grades.${grade}`, { ns: 'learning' });
}

export const GRADE_BUTTON_STYLES: Record<Grade, string> = {
  again: 'bg-red-500 text-white hover:bg-red-600 border-0',
  hard: 'bg-orange-400 text-white hover:bg-orange-600 border-0',
  good: 'bg-green-400 text-white hover:bg-green-600 border-0',
  easy: 'bg-blue-400 text-white hover:bg-blue-600 border-0',
};

export const GRADE_BADGE_STYLES: Record<Grade, string> = {
  again: 'bg-red-500 text-white border-transparent',
  hard: 'bg-orange-400 text-white border-transparent',
  good: 'bg-green-400 text-white border-transparent',
  easy: 'bg-blue-400 text-white border-transparent',
};

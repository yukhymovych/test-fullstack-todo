import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui';
import { useTranslation } from 'react-i18next';
import type { LearningSessionItem } from '../domain/learning.types';
import { notesRoutes } from '@/features/notes/lib/routes';

export interface LearningProgressHeaderProps {
  items: LearningSessionItem[];
  currentIndex: number;
}

export function LearningProgressHeader({
  items,
  currentIndex,
}: LearningProgressHeaderProps) {
  const navigate = useNavigate();
  const { t } = useTranslation('learning');
  const reviewableItems = items.filter((i) => i.state !== 'unavailable');
  const totalCount = reviewableItems.length;

  const handleStop = () => {
    navigate(notesRoutes.list());
  };

  return (
    <header className="learning-progress-header">
      <div className="learning-progress-header__progress">
        {currentIndex + 1} / {totalCount}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleStop}
        className="learning-progress-header__stop"
      >
        {t('progress.stopLearning')}
      </Button>
    </header>
  );
}
